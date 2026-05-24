import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { stockCode } = body;

  if (!stockCode || !/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ message: "无效的股票代码" }, { status: 400 });
  }

  // Fetch recent K-line data for analysis
  const rows = await prisma.stockDaily.findMany({
    where: { code: stockCode },
    orderBy: { date: "desc" },
    take: 60,
    select: { date: true, open: true, high: true, low: true, close: true, volume: true },
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { message: `未找到 ${stockCode} 的行情数据` },
      { status: 404 }
    );
  }

  const klines = rows.reverse();

  // Calculate technical indicators
  const closes = klines.map((k) => Number(k.close));
  const latest = klines[klines.length - 1];
  const latestClose = Number(latest.close);

  // MA5, MA10, MA20
  function ma(data: number[], period: number) {
    if (data.length < period) return null;
    return +(data.slice(-period).reduce((s, v) => s + v, 0) / period).toFixed(2);
  }

  const ma5 = ma(closes, 5);
  const ma10 = ma(closes, 10);
  const ma20 = ma(closes, 20);

  // Recent high/low for support/resistance
  const recent20High = Math.max(...klines.slice(-20).map((k) => Number(k.high)));
  const recent20Low = Math.min(...klines.slice(-20).map((k) => Number(k.low)));

  // Volume trend
  const recent5Vol =
    klines.slice(-5).reduce((s, k) => s + Number(k.volume), 0) / 5;
  const prior15Vol =
    klines.slice(-20, -5).reduce((s, k) => s + Number(k.volume), 0) / 15;

  // Price change over periods
  const change5d =
    closes.length >= 5
      ? +(((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100).toFixed(2)
      : null;
  const change20d =
    closes.length >= 20
      ? +(((closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21]) * 100).toFixed(2)
      : null;

  // Determine trend
  let trend = "震荡整理";
  if (ma5 && ma20 && ma5 > ma20 && closes[closes.length - 1] > closes[closes.length - 5]) {
    trend = "短期偏多";
  } else if (ma5 && ma20 && ma5 < ma20 && closes[closes.length - 1] < closes[closes.length - 5]) {
    trend = "短期偏空";
  }

  // Volume assessment
  const volRatio = prior15Vol > 0 ? recent5Vol / prior15Vol : 1;
  let volumeNote = "成交量平稳";
  if (volRatio > 1.5) volumeNote = "近期放量，关注度高";
  if (volRatio < 0.6) volumeNote = "近期缩量，市场观望";

  const analysis = {
    stockCode,
    latestPrice: latestClose,
    date: latest.date,
    indicators: {
      ma5,
      ma10,
      ma20,
      support: recent20Low.toFixed(2),
      resistance: recent20High.toFixed(2),
    },
    performance: {
      change5d,
      change20d,
    },
    summary: {
      trend,
      volumeNote,
      signal:
        trend === "短期偏多" && volRatio > 1.2
          ? "偏强"
          : trend === "短期偏空" && volRatio < 0.8
            ? "偏弱"
            : "中性",
    },
  };

  return NextResponse.json(analysis);
}
