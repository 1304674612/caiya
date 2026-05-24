import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wallet, TrendingUp, BarChart3, Calendar, Hash, PieChart } from "lucide-react";

function fmt(n: number): string {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [account, positions, tradeCount] = await Promise.all([
    prisma.virtualAccount.findUnique({ where: { userId: session.user.id } }),
    prisma.position.findMany({
      where: { userId: session.user.id, quantity: { gt: 0 } },
      select: { stockCode: true, stockName: true, avgCost: true, quantity: true },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ]);

  const balance = account ? Number(account.balance) : 0;
  const totalAssets = account ? Number(account.totalAssets) : 0;
  const totalPnl = totalAssets - 200000;
  const pnlRate = (totalPnl / 200000) * 100;

  const initials = session.user.name?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">个人中心</h2>
        <p className="text-sm text-muted-foreground mt-0.5">管理你的账户信息与交易数据</p>
      </div>

      {/* 用户信息卡片 */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session.user.image || ""} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{session.user.name || "用户"}</CardTitle>
              <CardDescription>{session.user.email}</CardDescription>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{session.user.role === "admin" ? "管理员" : "普通用户"}</Badge>
                <Badge variant="default" className="text-xs">风险已确认</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 账户概览 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100">
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

        <Card className="shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100">
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

        <Card className={`shadow-sm bg-gradient-to-br ${totalPnl >= 0 ? "from-red-50 to-red-100/50 border-red-100" : "from-green-50 to-green-100/50 border-green-100"}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${totalPnl >= 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                <PieChart className={`h-4.5 w-4.5 ${totalPnl >= 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className={`text-xs font-medium ${totalPnl >= 0 ? "text-red-600/70" : "text-green-600/70"}`}>累计盈亏</p>
                <p className={`text-lg font-bold tabular-nums ${totalPnl >= 0 ? "text-red-700" : "text-green-700"}`}>
                  {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-100">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <BarChart3 className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-violet-600/70 font-medium">交易次数</p>
                <p className="text-lg font-bold text-violet-900 tabular-nums">{tradeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 账户详情 + 持仓明细 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">账户详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" />
                  初始资金
                </span>
                <span className="font-mono font-medium">¥200,000.00</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  当前总资产
                </span>
                <span className="font-mono font-medium">¥{fmt(totalAssets)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <PieChart className="h-3.5 w-3.5" />
                  累计收益率
                </span>
                <span className={`font-mono font-medium ${pnlRate >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {pnlRate >= 0 ? "+" : ""}{pnlRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  持仓数量
                </span>
                <span className="font-mono font-medium">{positions.length} 只</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  累计交易
                </span>
                <span className="font-mono font-medium">{tradeCount} 笔</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  注册时间
                </span>
                <span className="font-mono font-medium">
                  {account?.createdAt
                    ? new Date(account.createdAt).toLocaleDateString("zh-CN")
                    : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">当前持仓</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PieChart className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm">暂无持仓</p>
                <p className="text-xs text-gray-400 mt-1">去模拟交易开始投资吧</p>
              </div>
            ) : (
              <div className="space-y-2">
                {positions.map((pos) => (
                  <div
                    key={pos.stockCode}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <span className="font-mono font-semibold text-blue-600">{pos.stockCode}</span>
                      {pos.stockName && (
                        <span className="ml-2 text-xs text-muted-foreground">{pos.stockName}</span>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-mono">{pos.quantity.toLocaleString()} 股</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        成本 ¥{fmt(Number(pos.avgCost))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
