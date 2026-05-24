import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STOCK_NAMES: Record<string, string> = {
  "000001": "平安银行", "000002": "万科A", "000858": "五粮液",
  "002415": "海康威视", "002594": "比亚迪", "300750": "宁德时代",
  "600000": "浦发银行", "600009": "上海机场", "600016": "民生银行",
  "600028": "中国石化", "600030": "中信证券", "600036": "招商银行",
  "600048": "保利发展", "600276": "恒瑞医药", "600519": "贵州茅台",
  "600585": "海螺水泥", "601012": "隆基绿能", "601088": "中国神华",
  "601166": "兴业银行", "601318": "中国平安",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  const keyword = searchParams.get("keyword")?.trim();
  const type = searchParams.get("type") || "daily";
  const range = searchParams.get("range") || "30d";
  const action = searchParams.get("action");

  // 股票列表 / 搜索
  if (action === "list" || keyword) {
    try {
      const codes = await prisma.stockDaily.findMany({
        where: keyword
          ? { code: { contains: keyword } }
          : {},
        select: { code: true },
        distinct: ["code"],
        orderBy: { code: "asc" },
      });

      // 如果 keyword 也匹配名称
      const results = codes.map((c) => ({
        code: c.code,
        name: STOCK_NAMES[c.code] || null,
      }));

      // 如果有关键词，也按名称过滤
      const filtered = keyword
        ? results.filter(
            (r) =>
              r.code.includes(keyword) ||
              (r.name && r.name.includes(keyword))
          )
        : results;

      return NextResponse.json({ stocks: filtered });
    } catch (error) {
      console.error("股票列表查询失败:", error);
      return NextResponse.json({ message: "查询失败" }, { status: 500 });
    }
  }

  if (!code) {
    return NextResponse.json({ message: "缺少股票代码" }, { status: 400 });
  }

  try {
    if (type === "intraday") {
      const limit = range === "1d" ? 240 : 60;
      const rows = await prisma.stockIntraday.findMany({
        where: { code },
        orderBy: { datetime: "desc" },
        take: limit,
      });

      const klines = rows.reverse().map((r) => ({
        time: r.datetime.toISOString(),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume),
      }));

      return NextResponse.json({
        code,
        name: STOCK_NAMES[code] || null,
        type: "intraday",
        klines,
      });
    }

    const days = rangeToDays(range);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.stockDaily.findMany({
      where: { code, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    const klines = rows.map((r) => ({
      time: r.date.toISOString().slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }));

    const latest = rows.length > 0 ? rows[rows.length - 1] : null;

    return NextResponse.json({
      code,
      name: STOCK_NAMES[code] || null,
      type: "daily",
      latestPrice: latest ? Number(latest.close) : null,
      klines,
    });
  } catch (error) {
    console.error("行情查询失败:", error);
    return NextResponse.json({ message: "行情数据查询失败" }, { status: 500 });
  }
}

function rangeToDays(range: string): number {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    case "2y": return 730;
    default: return 30;
  }
}
