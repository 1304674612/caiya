import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, PieChart, ArrowUpDown, Coins } from "lucide-react";
import Link from "next/link";

function fmt(n: number): string {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [account, positions] = await Promise.all([
    prisma.virtualAccount.findUnique({ where: { userId: session.user.id } }),
    prisma.position.findMany({
      where: { userId: session.user.id, quantity: { gt: 0 } },
      orderBy: { marketValue: "desc" },
    }),
  ]);

  const balance = account ? Number(account.balance) : 0;
  const totalAssets = account ? Number(account.totalAssets) : 0;

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

  // 计算持仓汇总
  let totalMarketValue = 0;
  let totalPnl = 0;
  let totalCost = 0;
  const positionDetails = positions.map((pos) => {
    const currentPrice = priceMap.get(pos.stockCode) || 0;
    const cost = Number(pos.avgCost) * pos.quantity;
    const mktVal = currentPrice * pos.quantity;
    const pnl = mktVal - cost;
    totalMarketValue += mktVal;
    totalPnl += pnl;
    totalCost += cost;
    return {
      code: pos.stockCode,
      name: pos.stockName,
      avgCost: Number(pos.avgCost),
      quantity: pos.quantity,
      currentPrice,
      marketValue: mktVal,
      pnl,
      pnlRate: cost > 0 ? (pnl / cost) * 100 : 0,
    };
  });

  const pnlRate = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-sm text-muted-foreground mt-0.5">欢迎回来，你的投资学习之旅</p>
      </div>

      {/* 资产概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Wallet className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600/70 font-medium">可用资金</p>
                <p className="text-lg font-bold text-blue-900 tabular-nums">¥{fmt(balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600/70 font-medium">总资产</p>
                <p className="text-lg font-bold text-emerald-900 tabular-nums">¥{fmt(totalAssets)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br shadow-sm ${totalPnl >= 0 ? "from-red-50 to-red-100/50 border-red-100" : "from-green-50 to-green-100/50 border-green-100"}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${totalPnl >= 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                <ArrowUpDown className={`h-4.5 w-4.5 ${totalPnl >= 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className={`text-xs font-medium ${totalPnl >= 0 ? "text-red-600/70" : "text-green-600/70"}`}>持仓盈亏</p>
                <p className={`text-lg font-bold tabular-nums ${totalPnl >= 0 ? "text-red-700" : "text-green-700"}`}>
                  {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-100 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <PieChart className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-violet-600/70 font-medium">持仓股票</p>
                <p className="text-lg font-bold text-violet-900 tabular-nums">{positions.length} 只</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速入口 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/trade" className="group">
          <Card className="border hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">模拟交易</p>
                  <p className="text-xs text-muted-foreground">¥200,000 虚拟资金实战</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/forum" className="group">
          <Card className="border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <Coins className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">论坛社区</p>
                  <p className="text-xs text-muted-foreground">讨论 & 复盘记录</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/learn" className="group">
          <Card className="border hover:border-purple-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <span className="text-lg">📚</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">课程学习</p>
                  <p className="text-xs text-muted-foreground">K线 · PE/PB · 均线</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai" className="group">
          <Card className="border hover:border-amber-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">AI 分析</p>
                  <p className="text-xs text-muted-foreground">智能选股视角</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 持仓概览 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="h-4.5 w-4.5 text-amber-600" />
              持仓明细
            </CardTitle>
            <Link href="/trade" className="text-xs text-blue-600 hover:underline">
              去交易 →
            </Link>
          </CardHeader>
          <CardContent>
            {positionDetails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PieChart className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm">暂无持仓</p>
                <p className="text-xs text-gray-400 mt-1">去模拟交易开始投资吧</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positionDetails.slice(0, 5).map((pos) => (
                  <Link
                    key={pos.code}
                    href={`/trade`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-mono font-semibold text-blue-600">{pos.code}</span>
                      {pos.name && (
                        <span className="ml-2 text-xs text-muted-foreground">{pos.name}</span>
                      )}
                      <span className="ml-3 text-xs text-muted-foreground">
                        {pos.quantity.toLocaleString()} 股
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">¥{fmt(pos.marketValue)}</p>
                      <p className={`text-xs font-mono ${pos.pnl >= 0 ? "text-red-600" : "text-green-600"}`}>
                        {pos.pnl >= 0 ? "+" : ""}{fmt(pos.pnl)}
                        <span className="ml-1">({pos.pnlRate >= 0 ? "+" : ""}{pos.pnlRate.toFixed(2)}%)</span>
                      </p>
                    </div>
                  </Link>
                ))}
                {positionDetails.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">
                    还有 {positionDetails.length - 5} 只持仓，前往交易页查看
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 学习提醒 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">投资学习提醒</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {[
                { icon: "📊", text: "模拟交易让你在无风险环境中练习真实交易" },
                { icon: "🤖", text: "AI 分析仅供参考，不构成投资建议" },
                { icon: "📝", text: "完成交易后来论坛记录你的复盘思考" },
                { icon: "📚", text: "先学基础知识，再逐步深入" },
                { icon: "💡", text: `持仓 ${positions.length} 只，总市值 ¥${fmt(totalMarketValue)}` },
                { icon: "🎯", text: `累计盈亏 ${totalPnl >= 0 ? "+" : ""}${fmt(totalPnl)}（${totalPnl >= 0 ? "+" : ""}${pnlRate.toFixed(2)}%）` },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <span className="text-base mt-0.5">{item.icon}</span>
                  <p className="text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
