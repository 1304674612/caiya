import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tradeSchema } from "@/lib/validations";
import {
  calcBuyFee,
  calcSellFee,
  calcAvgCost,
  calcSellPosition,
  calcPnl,
  calcRealizedPnl,
  validateBuyOrder,
  validateSellOrder,
  hasValidQuote,
} from "@/lib/trade-engine";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { riskAcknowledgedAt: true },
  });
  if (!user?.riskAcknowledgedAt) {
    return NextResponse.json(
      { message: "请先确认风险告知书" },
      { status: 403 }
    );
  }

  try {
    const [account, positions, orders] = await Promise.all([
      prisma.virtualAccount.findUnique({ where: { userId } }),
      prisma.position.findMany({ where: { userId, quantity: { gt: 0 } } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // 批量获取最新价，避免 N+1
    const codes = positions.map((p) => p.stockCode);
    const latestPrices =
      codes.length > 0
        ? await prisma.$queryRaw<Array<{ code: string; close: number }>>`
            SELECT DISTINCT ON (code) code, close FROM "StockDaily"
            WHERE code = ANY(${codes}::text[])
            ORDER BY code, date DESC
          `
        : [];

    const priceMap = new Map(latestPrices.map((r) => [r.code, Number(r.close)]));

    // 为每个持仓补充现价和盈亏
    const positionsWithPnl = positions.map((pos) => {
      const currentPrice = priceMap.get(pos.stockCode) || 0;
      const { pnl, pnlRate } = calcPnl(
        Number(pos.avgCost),
        currentPrice,
        pos.quantity
      );

      return {
        stockCode: pos.stockCode,
        stockName: pos.stockName,
        avgCost: Number(pos.avgCost),
        quantity: pos.quantity,
        currentPrice,
        marketValue: currentPrice * pos.quantity,
        pnl,
        pnlRate,
      };
    });

    return NextResponse.json({
      account: account
        ? {
            balance: Number(account.balance),
            totalAssets: Number(account.totalAssets),
            dailyPnl: Number(account.dailyPnl),
          }
        : null,
      positions: positionsWithPnl,
      orders: orders.map((o) => ({
        id: o.id,
        stockCode: o.stockCode,
        stockName: o.stockName,
        type: o.type,
        price: Number(o.price),
        quantity: o.quantity,
        status: o.status,
        fee: Number(o.fee),
        tax: Number(o.tax),
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error("查询交易数据失败:", error);
    return NextResponse.json({ message: "查询失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { riskAcknowledgedAt: true },
  });
  if (!user?.riskAcknowledgedAt) {
    return NextResponse.json(
      { message: "请先确认风险告知书" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = tradeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { stockCode, stockName, type, price, quantity } = parsed.data;

    // 获取账户
    const account = await prisma.virtualAccount.findUnique({
      where: { userId },
    });
    if (!account) {
      return NextResponse.json({ message: "账户不存在" }, { status: 404 });
    }

    // 获取最新行情
    const latestQuote = await prisma.stockDaily.findFirst({
      where: { code: stockCode },
      orderBy: { date: "desc" },
    });

    if (!hasValidQuote(latestQuote ? Number(latestQuote.close) : null)) {
      return NextResponse.json(
        { message: "该股票无有效行情数据，可能已停牌" },
        { status: 400 }
      );
    }

    const latestClose = Number(latestQuote!.close);
    const preClose = latestQuote!.close;

    // 获取持仓
    const position = await prisma.position.findUnique({
      where: { userId_stockCode: { userId, stockCode } },
    });

    // 校验
    if (type === "buy") {
      const validation = validateBuyOrder({
        availableCash: Number(account.balance),
        buyPrice: price,
        buyQuantity: quantity,
        preClose: Number(preClose),
        latestClose,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { message: validation.reason },
          { status: 400 }
        );
      }
    } else {
      const posInput = position
        ? { avgCost: Number(position.avgCost), quantity: position.quantity }
        : null;
      const validation = validateSellOrder({
        currentPosition: posInput,
        sellPrice: price,
        sellQuantity: quantity,
        preClose: Number(preClose),
        latestClose,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { message: validation.reason },
          { status: 400 }
        );
      }
    }

    // 执行交易（事务）
    const grossAmount = price * quantity;

    if (type === "buy") {
      const { fee, tax, netAmount } = calcBuyFee(grossAmount);

      const newPos = calcAvgCost(
        position
          ? { avgCost: Number(position.avgCost), quantity: position.quantity }
          : null,
        price,
        quantity
      );

      await prisma.$transaction(async (tx) => {
        // 扣减现金
        await tx.virtualAccount.update({
          where: { userId },
          data: { balance: { decrement: netAmount } },
        });

        // 更新持仓
        await tx.position.upsert({
          where: { userId_stockCode: { userId, stockCode } },
          create: {
            userId,
            stockCode,
            stockName,
            avgCost: newPos.avgCost,
            quantity: newPos.quantity,
            marketValue: latestClose * newPos.quantity,
          },
          update: {
            stockName,
            avgCost: newPos.avgCost,
            quantity: newPos.quantity,
            marketValue: latestClose * newPos.quantity,
          },
        });

        // 重新计算总资产 = 最新现金 + 所有持仓市值
        const [accountAfter, mktValRows] = await Promise.all([
          tx.virtualAccount.findUnique({
            where: { userId },
            select: { balance: true },
          }),
          tx.position.findMany({
            where: { userId, quantity: { gt: 0 } },
            select: { marketValue: true },
          }),
        ]);
        const totalMktVal = mktValRows.reduce(
          (sum, p) => sum + Number(p.marketValue),
          0
        );
        const totalAssets = Number(accountAfter!.balance) + totalMktVal;

        await tx.virtualAccount.update({
          where: { userId },
          data: { totalAssets },
        });

        // 创建委托单（已成交）
        await tx.order.create({
          data: {
            userId,
            stockCode,
            stockName,
            type: "buy",
            price,
            quantity,
            status: "filled",
            fee,
            tax,
            filledAt: new Date(),
          },
        });

        // 交易流水
        await tx.transaction.create({
          data: {
            userId,
            type: "buy",
            amount: netAmount,
            stockCode,
            stockName,
            price,
            quantity,
            fee,
            tax,
          },
        });
      });

      return NextResponse.json({
        message: "买入成功",
        fee,
        tax,
        totalCost: netAmount,
      });
    } else {
      // 卖出
      const { fee, tax, netAmount } = calcSellFee(grossAmount);

      const posData = position!;
      const realizedPnl = calcRealizedPnl(
        Number(posData.avgCost),
        price,
        quantity,
        fee,
        tax
      );

      const remaining = calcSellPosition(
        { avgCost: Number(posData.avgCost), quantity: posData.quantity },
        quantity
      );

      await prisma.$transaction(async (tx) => {
        // 增加现金
        await tx.virtualAccount.update({
          where: { userId },
          data: { balance: { increment: netAmount } },
        });

        // 更新或删除持仓
        if (remaining) {
          await tx.position.update({
            where: { userId_stockCode: { userId, stockCode } },
            data: {
              quantity: remaining.quantity,
              marketValue: latestClose * remaining.quantity,
            },
          });
        } else {
          await tx.position.delete({
            where: { userId_stockCode: { userId, stockCode } },
          });
        }

        // 重新计算总资产 = 最新现金 + 所有持仓市值
        const [accountAfter, mktValRows] = await Promise.all([
          tx.virtualAccount.findUnique({
            where: { userId },
            select: { balance: true },
          }),
          tx.position.findMany({
            where: { userId, quantity: { gt: 0 } },
            select: { marketValue: true },
          }),
        ]);
        const totalMktVal = mktValRows.reduce(
          (sum, p) => sum + Number(p.marketValue),
          0
        );
        const totalAssets = Number(accountAfter!.balance) + totalMktVal;

        await tx.virtualAccount.update({
          where: { userId },
          data: { totalAssets },
        });

        // 创建委托单
        await tx.order.create({
          data: {
            userId,
            stockCode,
            stockName,
            type: "sell",
            price,
            quantity,
            status: "filled",
            fee,
            tax,
            filledAt: new Date(),
          },
        });

        // 交易流水
        await tx.transaction.create({
          data: {
            userId,
            type: "sell",
            amount: netAmount,
            stockCode,
            stockName,
            price,
            quantity,
            fee,
            tax,
          },
        });
      });

      return NextResponse.json({
        message: "卖出成功",
        fee,
        tax,
        netAmount,
        realizedPnl,
      });
    }
  } catch (error) {
    console.error("交易失败:", error);
    return NextResponse.json({ message: "交易失败，请重试" }, { status: 500 });
  }
}
