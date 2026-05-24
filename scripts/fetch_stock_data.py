#!/usr/bin/env python3
"""
财芽（CaiYa）— 行情数据同步脚本

功能：
  - 从 AKShare 获取 A 股日线数据，增量写入 StockDaily 表
  - 从 AKShare 获取分钟数据，写入 StockIntraday 表
  - 支持全量同步 / 增量同步 / 单股票同步
  - 幂等写入（ON CONFLICT 更新）
  - 错误重试（指数退避）+ 同步日志写入 DataSyncLog

用法:
  python fetch_stock_data.py                  # 增量同步日线（默认 30 天）
  python fetch_stock_data.py --full           # 全量同步（最近 2 年）
  python fetch_stock_data.py --code 000001    # 只同步指定股票
  python fetch_stock_data.py --intraday       # 同步分钟数据
  python fetch_stock_data.py --top 50         # 只同步市值前 50

环境变量:
  DATABASE_URL          PostgreSQL 连接串
  TUSHARE_TOKEN         可选，分钟数据备用源
"""

import os
import sys
import time
import json
import uuid
import logging
import argparse
from datetime import datetime, date, timedelta
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# 加载 .env 文件（从项目根目录）
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# ─── 日志配置 ──────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            Path(__file__).resolve().parent / "fetch_stock_data.log",
            encoding="utf-8",
        ),
    ],
)
logger = logging.getLogger(__name__)

# ─── 数据库连接 ────────────────────────────────────

def get_db_url():
    """获取数据库连接 URL，优先使用 DATABASE_DIRECT_URL"""
    url = os.getenv("DATABASE_DIRECT_URL") or os.getenv("DATABASE_URL")
    if not url:
        logger.error("未设置 DATABASE_URL 或 DATABASE_DIRECT_URL 环境变量")
        sys.exit(1)
    return url


def get_conn():
    """创建数据库连接"""
    return psycopg2.connect(get_db_url())


# ─── AKShare 数据获取 ─────────────────────────────

def fetch_stock_list(top_n: int | None = None) -> list[dict]:
    """
    获取 A 股股票列表（沪深两市）
    返回 [{code, name}, ...]
    """
    import akshare as ak

    logger.info("正在获取 A 股股票列表...")
    try:
        df = ak.stock_zh_a_spot_em()
    except Exception:
        logger.warning("akshare stock_zh_a_spot_em 失败，尝试备用接口...")
        try:
            df = ak.stock_info_a_code_name()
            df = df.rename(columns={"code": "代码", "name": "名称"})
            df["代码"] = df["代码"].astype(str).str.zfill(6)
        except Exception as e:
            logger.error(f"获取股票列表失败: {e}")
            raise

    stocks = []
    for _, row in df.iterrows():
        code = str(row.get("代码", "")).strip()
        name = str(row.get("名称", "")).strip()
        if len(code) == 6 and code.isdigit():
            stocks.append({"code": code, "name": name})

    logger.info(f"获取到 {len(stocks)} 只股票")

    if top_n and top_n > 0:
        stocks = stocks[:top_n]
        logger.info(f"截取前 {top_n} 只")

    return stocks


def fetch_daily_history(
    code: str, start_date: str, end_date: str, adjust: str = "qfq"
) -> pd.DataFrame | None:
    """
    获取单只股票日线数据
    adjust: qfq(前复权) | hfq(后复权) | ''(不复权)
    """
    # 清除代理设置，避免网络连接问题
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
        os.environ.pop(key, None)

    import akshare as ak

    try:
        # AKShare 新版本使用 stock_zh_a_hist
        df = ak.stock_zh_a_hist(
            symbol=code,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust=adjust,
        )
        if df is None or df.empty:
            return None

        # 标准化列名
        df = df.rename(
            columns={
                "日期": "date",
                "开盘": "open",
                "收盘": "close",
                "最高": "high",
                "最低": "low",
                "成交量": "volume",
                "成交额": "amount",
            }
        )

        df["code"] = code
        df["date"] = pd.to_datetime(df["date"]).dt.date
        df["adjusted"] = adjust != ""

        # 确保数值列类型
        for col in ["open", "close", "high", "low"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df["volume"] = pd.to_numeric(df.get("volume", 0), errors="coerce").fillna(0).astype(int)
        df["amount"] = pd.to_numeric(df.get("amount", 0), errors="coerce")

        # 去掉 NaN 行
        df = df.dropna(subset=["open", "close", "high", "low"])

        return df

    except Exception as e:
        logger.error(f"获取 {code} 日线数据失败: {e}")
        return None


def fetch_minute_history(
    code: str, period: str = "1"
) -> pd.DataFrame | None:
    """
    获取单只股票分钟数据
    period: 1/5/15/30/60（分钟）
    """
    import akshare as ak

    try:
        df = ak.stock_zh_a_hist_min_em(symbol=code, period=period)

        if df is None or df.empty:
            return None

        df = df.rename(
            columns={
                "时间": "datetime",
                "开盘": "open",
                "收盘": "close",
                "最高": "high",
                "最低": "low",
                "成交量": "volume",
            }
        )

        df["code"] = code
        df["datetime"] = pd.to_datetime(df["datetime"])

        for col in ["open", "close", "high", "low"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df["volume"] = pd.to_numeric(df.get("volume", 0), errors="coerce").fillna(0).astype(int)
        df = df.dropna(subset=["open", "close", "high", "low"])

        return df

    except Exception as e:
        logger.error(f"获取 {code} 分钟数据失败: {e}")
        return None


# ─── 数据库操作 ────────────────────────────────────

def get_last_date(conn, code: str, table: str = "StockDaily") -> date | None:
    """查询某只股票在数据库中的最新日期"""
    cursor = conn.cursor()
    if table == "StockDaily":
        cursor.execute(
            'SELECT MAX(date) FROM "StockDaily" WHERE code = %s', (code,)
        )
    else:
        cursor.execute(
            'SELECT MAX(datetime)::date FROM "StockIntraday" WHERE code = %s',
            (code,),
        )
    row = cursor.fetchone()
    return row[0] if row and row[0] else None


def upsert_daily_data(conn, df: pd.DataFrame) -> int:
    """幂等写入日线数据，返回写入行数"""
    if df.empty:
        return 0

    cursor = conn.cursor()
    rows = []
    for _, row in df.iterrows():
        rows.append((
            row["code"],
            row["date"],
            float(row["open"]),
            float(row["high"]),
            float(row["low"]),
            float(row["close"]),
            int(row["volume"]),
            float(row["amount"]) if pd.notna(row.get("amount")) else None,
            bool(row.get("adjusted", False)),
        ))

    sql = """
        INSERT INTO "StockDaily" (code, date, open, high, low, close, volume, amount, adjusted)
        VALUES %s
        ON CONFLICT (code, date) DO UPDATE SET
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume,
            amount = EXCLUDED.amount,
            adjusted = EXCLUDED.adjusted
    """
    execute_values(cursor, sql, rows)
    conn.commit()
    return len(rows)


def upsert_intraday_data(conn, df: pd.DataFrame) -> int:
    """幂等写入分钟数据，返回写入行数"""
    if df.empty:
        return 0

    cursor = conn.cursor()
    rows = []
    for _, row in df.iterrows():
        rows.append((
            row["code"],
            row["datetime"].to_pydatetime(),
            float(row["open"]),
            float(row["high"]),
            float(row["low"]),
            float(row["close"]),
            int(row["volume"]),
        ))

    sql = """
        INSERT INTO "StockIntraday" (code, datetime, open, high, low, close, volume)
        VALUES %s
        ON CONFLICT (code, datetime) DO UPDATE SET
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume
    """
    execute_values(cursor, sql, rows)
    conn.commit()
    return len(rows)


def log_sync(
    conn,
    source: str,
    data_type: str,
    success: bool,
    records_in: int,
    message: str | None = None,
):
    """写入同步日志"""
    cursor = conn.cursor()
    now = datetime.now()
    cursor.execute(
        """
        INSERT INTO "DataSyncLog" (id, source, "dataType", success, "recordsIn", message, "startedAt", "finishedAt", "createdAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (str(uuid.uuid4()), source, data_type, success, records_in, message, now, now, now),
    )
    conn.commit()


# ─── 主同步逻辑 ────────────────────────────────────

def sync_daily(
    conn,
    stocks: list[dict],
    lookback_days: int = 30,
    retries: int = 3,
    delay: float = 2.0,
):
    """同步日线数据（增量）"""
    total_records = 0
    end_date = date.today().strftime("%Y%m%d")
    start_date = (date.today() - timedelta(days=lookback_days)).strftime("%Y%m%d")

    logger.info(f"开始日线同步：{len(stocks)} 只股票，回溯 {lookback_days} 天")

    for i, stock in enumerate(stocks):
        code = stock["code"]
        name = stock["name"]

        # 查询已有最新日期，增量拉取
        last_date = get_last_date(conn, code, "StockDaily")
        if last_date:
            fetch_start = (last_date + timedelta(days=1)).strftime("%Y%m%d")
        else:
            fetch_start = start_date

        if fetch_start > end_date:
            continue

        # 重试逻辑
        for attempt in range(retries):
            try:
                df = fetch_daily_history(code, fetch_start, end_date)
                if df is not None and not df.empty:
                    n = upsert_daily_data(conn, df)
                    total_records += n
                    if n > 0:
                        logger.debug(f"[{i+1}/{len(stocks)}] {code} {name}: +{n} 条")
                break
            except Exception as e:
                wait = delay * (2**attempt)
                logger.warning(
                    f"{code} {name} 第 {attempt+1}/{retries} 次失败: {e}，{wait}s 后重试"
                )
                time.sleep(wait)
        else:
            logger.error(f"{code} {name} 重试 {retries} 次后仍失败，跳过")

        # 请求间隔，避免被封
        time.sleep(0.1)

        if (i + 1) % 100 == 0:
            logger.info(f"进度: {i+1}/{len(stocks)}，已写入 {total_records} 条")

    logger.info(f"日线同步完成：{total_records} 条记录")
    log_sync(
        conn,
        "akshare",
        "daily",
        success=True,
        records_in=total_records,
        message=f"同步 {len(stocks)} 只股票，回溯 {lookback_days} 天",
    )
    return total_records


def sync_intraday(
    conn,
    stocks: list[dict],
    retries: int = 2,
    delay: float = 1.0,
):
    """同步分钟数据（当日）"""
    total_records = 0

    logger.info(f"开始分钟数据同步：{len(stocks)} 只股票")

    for i, stock in enumerate(stocks):
        code = stock["code"]
        name = stock["name"]

        for attempt in range(retries):
            try:
                df = fetch_minute_history(code)
                if df is not None and not df.empty:
                    n = upsert_intraday_data(conn, df)
                    total_records += n
                    if n > 0:
                        logger.debug(f"[{i+1}/{len(stocks)}] {code} {name}: +{n} 条分钟")
                break
            except Exception as e:
                wait = delay * (2**attempt)
                logger.warning(
                    f"{code} 分钟数据 第 {attempt+1}/{retries} 次失败: {e}"
                )
                time.sleep(wait)

        time.sleep(0.05)

        if (i + 1) % 100 == 0:
            logger.info(f"分钟进度: {i+1}/{len(stocks)}，已写入 {total_records} 条")

    logger.info(f"分钟数据同步完成：{total_records} 条记录")
    log_sync(
        conn,
        "akshare",
        "intraday",
        success=True,
        records_in=total_records,
        message=f"分钟同步 {len(stocks)} 只股票",
    )
    return total_records


# ─── CLI 入口 ──────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="财芽行情数据同步脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python fetch_stock_data.py                  增量同步日线（30天）
  python fetch_stock_data.py --full           全量同步（2年）
  python fetch_stock_data.py --code 000001    只同步 000001
  python fetch_stock_data.py --lookback 90    回溯 90 天
  python fetch_stock_data.py --intraday       同步分钟数据
  python fetch_stock_data.py --top 50         只同步市值前 50
        """,
    )
    parser.add_argument("--full", action="store_true", help="全量同步（2年）")
    parser.add_argument("--lookback", type=int, default=30, help="回溯天数（默认 30）")
    parser.add_argument("--code", type=str, help="只同步指定股票代码")
    parser.add_argument("--top", type=int, default=0, help="只同步市值前 N 只")
    parser.add_argument("--intraday", action="store_true", help="同步分钟数据")
    parser.add_argument("--retries", type=int, default=3, help="重试次数（默认 3）")
    parser.add_argument("--delay", type=float, default=1.0, help="重试间隔秒数（默认 1.0）")

    args = parser.parse_args()

    lookback = 365 * 2 if args.full else args.lookback

    conn = get_conn()
    logger.info("数据库连接成功")

    try:
        if args.code:
            stocks = [{"code": args.code, "name": args.code}]
        else:
            top_n = args.top if args.top > 0 else None
            stocks = fetch_stock_list(top_n)

        if not stocks:
            logger.warning("未获取到股票列表")
            return

        if args.intraday:
            sync_intraday(conn, stocks, retries=args.retries, delay=args.delay)
        else:
            sync_daily(
                conn,
                stocks,
                lookback_days=lookback,
                retries=args.retries,
                delay=args.delay,
            )

    except Exception as e:
        logger.error(f"同步异常: {e}")
        try:
            log_sync(
                conn,
                "akshare",
                "intraday" if args.intraday else "daily",
                success=False,
                records_in=0,
                message=str(e),
            )
        except Exception:
            pass
        sys.exit(1)
    finally:
        conn.close()
        logger.info("数据库连接已关闭")


if __name__ == "__main__":
    main()
