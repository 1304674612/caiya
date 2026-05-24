import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface KLine {
  date: string;
  close: number;
}

function runMA(
  klines: KLine[],
  params: { fast: number; slow: number }
) {
  const { fast, slow } = params;
  const trades: Array<{ date: string; type: "buy" | "sell"; price: number }> = [];
  let position = false;

  for (let i = slow; i < klines.length; i++) {
    const fastMA =
      klines.slice(i - fast, i + 1).reduce((s, k) => s + k.close, 0) / (fast + 1);
    const slowMA =
      klines.slice(i - slow, i + 1).reduce((s, k) => s + k.close, 0) / (slow + 1);

    if (fastMA > slowMA && !position) {
      trades.push({ date: klines[i].date, type: "buy", price: klines[i].close });
      position = true;
    } else if (fastMA < slowMA && position) {
      trades.push({ date: klines[i].date, type: "sell", price: klines[i].close });
      position = false;
    }
  }

  return trades;
}

function runMACD(
  klines: KLine[],
  params: { fast: number; slow: number; signal: number }
) {
  const { fast, slow, signal } = params;
  const trades: Array<{ date: string; type: "buy" | "sell"; price: number }> = [];
  const difHistory: number[] = [];
  const deaHistory: number[] = [];
  let position = false;

  for (let i = 0; i < klines.length; i++) {
    const emaFast =
      i === 0
        ? klines[i].close
        : (klines[i].close * 2) / (fast + 1) +
          (difHistory.length > 0
            ? ((fast - 1) / (fast + 1)) *
              (difHistory[difHistory.length - 1] * (slow + 1)) / 2
            : 0);

    const emaSlowCalc =
      i === 0
        ? klines[i].close
        : (klines[i].close * 2) / (slow + 1) +
          (difHistory.length > 0
            ? ((slow - 1) / (slow + 1)) *
              (deaHistory.length > 0
                ? (deaHistory[deaHistory.length - 1] * (signal + 1)) / 2
                : klines[i].close)
            : 0);

    // Simplified MACD calculation
    const emaFastVal =
      i === 0
        ? klines[i].close
        : (2 / (fast + 1)) * klines[i].close + ((fast - 1) / (fast + 1)) * (difHistory[difHistory.length - 1] ?? klines[i].close);
    const emaSlowVal =
      i === 0
        ? klines[i].close
        : (2 / (slow + 1)) * klines[i].close + ((slow - 1) / (slow + 1)) * (deaHistory[deaHistory.length - 1] ?? klines[i].close);

    const dif = emaFastVal - emaSlowVal;
    difHistory.push(dif);

    const dea =
      i === 0
        ? dif
        : (2 / (signal + 1)) * dif + ((signal - 1) / (signal + 1)) * (deaHistory[deaHistory.length - 1] ?? 0);
    deaHistory.push(dea);

    const macd = (dif - dea) * 2;

    if (i > slow) {
      if (macd > 0 && difHistory[i - 1] <= deaHistory[i - 1] && dif > dea && !position) {
        trades.push({ date: klines[i].date, type: "buy", price: klines[i].close });
        position = true;
      } else if (macd < 0 && difHistory[i - 1] >= deaHistory[i - 1] && dif < dea && position) {
        trades.push({ date: klines[i].date, type: "sell", price: klines[i].close });
        position = false;
      }
    }
  }

  return trades;
}

function runRSI(
  klines: KLine[],
  params: { period: number; oversold: number; overbought: number }
) {
  const { period, oversold, overbought } = params;
  const trades: Array<{ date: string; type: "buy" | "sell"; price: number }> = [];
  let position = false;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < klines.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      continue;
    }

    const change = klines[i].close - klines[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) continue;

    const avgGain = gains.slice(i - period, i + 1).reduce((s, v) => s + v, 0) / (period + 1);
    const avgLoss = losses.slice(i - period, i + 1).reduce((s, v) => s + v, 0) / (period + 1);

    if (avgLoss === 0) continue;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    if (rsi < oversold && !position) {
      trades.push({ date: klines[i].date, type: "buy", price: klines[i].close });
      position = true;
    } else if (rsi > overbought && position) {
      trades.push({ date: klines[i].date, type: "sell", price: klines[i].close });
      position = false;
    }
  }

  return trades;
}

function calcMetrics(
  trades: Array<{ date: string; type: "buy" | "sell"; price: number }>,
  initialCapital: number
) {
  if (trades.length < 2) {
    return {
      totalReturn: 0,
      winRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      totalTrades: 0,
      avgHoldDays: 0,
    };
  }

  const returns: number[] = [];
  let capital = initialCapital;
  let peak = capital;
  let maxDrawdown = 0;
  let wins = 0;
  const completedTrades: Array<{ buyDate: string; sellDate: string; buyPrice: number; sellPrice: number }> = [];
  let currentBuy: { date: string; price: number } | null = null;

  for (const t of trades) {
    if (t.type === "buy") {
      currentBuy = { date: t.date, price: t.price };
    } else if (t.type === "sell" && currentBuy) {
      const ret = (t.price - currentBuy.price) / currentBuy.price;
      returns.push(ret);
      capital *= 1 + ret;
      if (capital > peak) peak = capital;
      const dd = (peak - capital) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
      if (ret > 0) wins++;
      completedTrades.push({
        buyDate: currentBuy.date,
        sellDate: t.date,
        buyPrice: currentBuy.price,
        sellPrice: t.price,
      });
      currentBuy = null;
    }
  }

  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0;

  const meanRet = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / (returns.length - 1)
      : 0;
  const sharpeRatio = variance > 0 ? (meanRet / Math.sqrt(variance)) * Math.sqrt(252) : 0;

  let avgHoldDays = 0;
  if (completedTrades.length > 0) {
    avgHoldDays =
      completedTrades.reduce((s, t) => {
        const buy = new Date(t.buyDate);
        const sell = new Date(t.sellDate);
        return s + (sell.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / completedTrades.length;
  }

  return {
    totalReturn: +totalReturn.toFixed(1),
    winRate: +winRate.toFixed(1),
    maxDrawdown: +(-maxDrawdown * 100).toFixed(1),
    sharpeRatio: +sharpeRatio.toFixed(2),
    totalTrades: completedTrades.length,
    avgHoldDays: +avgHoldDays.toFixed(1),
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const {
    stockCode,
    startDate,
    endDate,
    strategy,
    params,
    capital: initialCapital,
  } = body;

  if (!stockCode || !/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ message: "无效的股票代码" }, { status: 400 });
  }
  if (!strategy || !["ma-cross", "rsi", "macd"].includes(strategy)) {
    return NextResponse.json({ message: "无效的策略类型" }, { status: 400 });
  }

  // Fetch real stock data from DB
  const rows = await prisma.stockDaily.findMany({
    where: {
      code: stockCode,
      date: {
        gte: new Date(startDate || "2024-01-01"),
        lte: new Date(endDate || "2025-12-31"),
      },
    },
    orderBy: { date: "asc" },
    select: { date: true, close: true },
  });

  if (rows.length < 50) {
    return NextResponse.json(
      { message: `数据不足：仅找到 ${rows.length} 条 ${stockCode} 的日线数据，至少需要 50 条` },
      { status: 400 }
    );
  }

  const klines: KLine[] = rows.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    close: Number(r.close),
  }));

  let trades: Array<{ date: string; type: "buy" | "sell"; price: number }>;

  switch (strategy) {
    case "ma-cross":
      trades = runMA(klines, {
        fast: parseInt(params.fast) || 5,
        slow: parseInt(params.slow) || 20,
      });
      break;
    case "rsi":
      trades = runRSI(klines, {
        period: parseInt(params.period) || 14,
        oversold: parseInt(params.oversold) || 30,
        overbought: parseInt(params.overbought) || 70,
      });
      break;
    case "macd":
      trades = runMACD(klines, {
        fast: parseInt(params.fast) || 12,
        slow: parseInt(params.slow) || 26,
        signal: parseInt(params.signal) || 9,
      });
      break;
    default:
      trades = [];
  }

  const capital = parseFloat(initialCapital) || 100000;
  const metrics = calcMetrics(trades, capital);

  return NextResponse.json({
    stockCode,
    startDate: klines[0].date,
    endDate: klines[klines.length - 1].date,
    dataPoints: klines.length,
    strategy,
    params,
    ...metrics,
  });
}
