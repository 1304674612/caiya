#!/usr/bin/env python3
"""
生成 A 股测试行情数据（带真实名称和价格波动）
"""
import os
import sys
import uuid
import random
from datetime import datetime, date, timedelta
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_DIRECT_URL") or os.getenv("DATABASE_URL")
if not DB_URL:
    print("未设置 DATABASE_URL")
    sys.exit(1)

# 沪深 300 前 20 只成分股（代码 + 名称 + 大致价格区间）
STOCKS = [
    ("000001", "平安银行", 13.5),
    ("000002", "万科A", 7.0),
    ("000858", "五粮液", 145.0),
    ("002415", "海康威视", 32.0),
    ("002594", "比亚迪", 260.0),
    ("300750", "宁德时代", 210.0),
    ("600000", "浦发银行", 9.5),
    ("600009", "上海机场", 35.0),
    ("600016", "民生银行", 4.2),
    ("600028", "中国石化", 6.5),
    ("600030", "中信证券", 22.0),
    ("600036", "招商银行", 38.0),
    ("600048", "保利发展", 10.0),
    ("600276", "恒瑞医药", 48.0),
    ("600519", "贵州茅台", 1680.0),
    ("600585", "海螺水泥", 25.0),
    ("601012", "隆基绿能", 18.0),
    ("601088", "中国神华", 38.0),
    ("601166", "兴业银行", 18.0),
    ("601318", "中国平安", 52.0),
]

random.seed(42)


def generate_daily_data(base_price: float, days: int = 60):
    """为一只股票生成日线数据，价格围绕 base_price 随机波动"""
    rows = []
    price = base_price * (0.85 + random.random() * 0.3)  # 起始价在 85%-115%
    today = date.today()

    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        if d.weekday() >= 5:  # 跳过周末
            continue

        change_pct = random.gauss(0, 0.02)  # 日均波动 2%
        open_price = round(price, 2)
        close_price = round(price * (1 + change_pct), 2)
        high_price = round(max(open_price, close_price) * (1 + abs(random.gauss(0, 0.01))), 2)
        low_price = round(min(open_price, close_price) * (1 - abs(random.gauss(0, 0.01))), 2)
        volume = int(abs(random.gauss(20000000, 10000000)))

        rows.append((d, open_price, high_price, low_price, close_price, volume))

        price = close_price

    return rows


def main():
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    total = 0
    for code, name, base_price in STOCKS:
        cursor.execute('SELECT MAX(date) FROM "StockDaily" WHERE code = %s', (code,))
        existing = cursor.fetchone()
        if existing and existing[0]:
            last_date = existing[0]
            days_since = (date.today() - last_date).days
            if days_since <= 5:
                print(f"  {code} {name}: 数据较新，跳过")
                continue

        daily = generate_daily_data(base_price, days=60)
        rows = [
            (str(uuid.uuid4()), code, d, o, h, l, c, v, round(c * v * 0.0001, 2), True)
            for d, o, h, l, c, v in daily
        ]

        sql = """
            INSERT INTO "StockDaily" (id, code, date, open, high, low, close, volume, amount, adjusted)
            VALUES %s
            ON CONFLICT (code, date) DO UPDATE SET
                open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                close = EXCLUDED.close, volume = EXCLUDED.volume, amount = EXCLUDED.amount
        """
        execute_values(cursor, sql, rows)
        conn.commit()
        print(f"  {code} {name}: {len(rows)} 条 (base: ¥{base_price})")
        total += len(rows)

    # 清理旧数据（3 只变 20 只，删除不在列表中的旧数据可保留）
    conn.close()
    print(f"\n完成！共写入 {total} 条记录，{len(STOCKS)} 只股票")


if __name__ == "__main__":
    main()
