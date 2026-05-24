/**
 * 财芽 — 行情数据同步脚本
 *
 * 从腾讯财经 API 拉取 A 股日线 K 线数据（前复权），写入 StockDaily 表。
 * 支持增量同步，幂等写入（ON CONFLICT DO UPDATE）。
 *
 * 用法:
 *   npx tsx scripts/fetch-stock-data.ts                    # 同步 20 只默认股票（最近 90 天）
 *   npx tsx scripts/fetch-stock-data.ts --code 000001       # 只同步指定股票
 *   npx tsx scripts/fetch-stock-data.ts --full              # 全量同步（最近 2 年）
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "..", ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 未设置，请检查 .env 文件");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── 股票列表 ───────────────────────────────────

interface StockInfo {
  code: string;
  name: string;
  prefix: "sz" | "sh";
}

const DEFAULT_STOCKS: StockInfo[] = [
  { code: "000001", name: "平安银行", prefix: "sz" },
  { code: "000002", name: "万科A", prefix: "sz" },
  { code: "000858", name: "五粮液", prefix: "sz" },
  { code: "002415", name: "海康威视", prefix: "sz" },
  { code: "002594", name: "比亚迪", prefix: "sz" },
  { code: "300750", name: "宁德时代", prefix: "sz" },
  { code: "600000", name: "浦发银行", prefix: "sh" },
  { code: "600009", name: "上海机场", prefix: "sh" },
  { code: "600016", name: "民生银行", prefix: "sh" },
  { code: "600028", name: "中国石化", prefix: "sh" },
  { code: "600030", name: "中信证券", prefix: "sh" },
  { code: "600036", name: "招商银行", prefix: "sh" },
  { code: "600048", name: "保利发展", prefix: "sh" },
  { code: "600276", name: "恒瑞医药", prefix: "sh" },
  { code: "600519", name: "贵州茅台", prefix: "sh" },
  { code: "600585", name: "海螺水泥", prefix: "sh" },
  { code: "601012", name: "隆基绿能", prefix: "sh" },
  { code: "601088", name: "中国神华", prefix: "sh" },
  { code: "601166", name: "兴业银行", prefix: "sh" },
  { code: "601318", name: "中国平安", prefix: "sh" },
];

// ─── API 调用 ────────────────────────────────────

interface KLineRaw {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/**
 * 腾讯财经 K 线 API
 * 响应格式: data.{prefix}{code}.qfqday = [["2026-05-18","10.96","10.86","10.97","10.82","856382.0"], ...]
 * 字段顺序: date, open, close, high, low, volume
 */
async function fetchKLine(
  stock: StockInfo,
  count: number
): Promise<KLineRaw[]> {
  const param = `${stock.prefix}${stock.code},day,,,${count},qfq`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${param}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  const key = `${stock.prefix}${stock.code}`;
  const klines: string[][] = json?.data?.[key]?.qfqday ?? [];

  if (!klines.length) {
    return [];
  }

  return klines.map((row) => ({
    date: row[0],
    open: parseFloat(row[1]),
    close: parseFloat(row[2]),
    high: parseFloat(row[3]),
    low: parseFloat(row[4]),
    volume: Math.round(parseFloat(row[5])),
  }));
}

// ─── 数据库写入 ──────────────────────────────────

async function upsertDaily(stock: StockInfo, klines: KLineRaw[]) {
  for (const kl of klines) {
    await prisma.$executeRaw`
      INSERT INTO "StockDaily" ("id", "code", "date", "open", "high", "low", "close", "volume", "adjusted")
      VALUES (gen_random_uuid(), ${stock.code}, ${kl.date}::date, ${kl.open}, ${kl.high}, ${kl.low}, ${kl.close}, ${kl.volume}, true)
      ON CONFLICT ("code", "date")
      DO UPDATE SET
        "open" = EXCLUDED."open",
        "high" = EXCLUDED."high",
        "low" = EXCLUDED."low",
        "close" = EXCLUDED."close",
        "volume" = EXCLUDED."volume",
        "adjusted" = EXCLUDED."adjusted"
    `;
  }
}

// ─── 主流程 ──────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes("--full");
  const specificCode = args.find((a) => a.startsWith("--code="))?.split("=")[1];

  const stocks = specificCode
    ? DEFAULT_STOCKS.filter((s) => s.code === specificCode)
    : DEFAULT_STOCKS;

  if (stocks.length === 0) {
    console.error(`未找到股票代码: ${specificCode}`);
    process.exit(1);
  }

  // 腾讯 API 不支持日期筛选，用 count 控制
  const count = full ? 480 : 60; // 约 2 年 / 3 个月
  const label = full ? "全量（约 2 年）" : "增量（约 3 个月）";

  console.log(`同步 ${stocks.length} 只股票，${label}...\n`);

  let totalKlines = 0;
  let failures = 0;

  for (const stock of stocks) {
    try {
      process.stdout.write(`  ${stock.code} ${stock.name} ... `);
      const klines = await fetchKLine(stock, count);

      if (klines.length === 0) {
        console.log("无数据");
        continue;
      }

      await upsertDaily(stock, klines);
      const latest = klines[klines.length - 1];
      console.log(
        `${klines.length} 条 (${klines[0].date} ~ ${latest.date}, 最新 ¥${latest.close})`
      );
      totalKlines += klines.length;

      // 请求间隔
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      failures++;
      console.error(`失败: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n完成: ${totalKlines} 条数据, 失败 ${failures} 只`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("脚本异常:", err);
  process.exit(1);
});
