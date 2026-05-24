"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

function fmt(n: number): string {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, Coins, Search, ArrowUpDown } from "lucide-react";

const KLineChart = dynamic(
  () => import("@/components/chart/KLineChart").then((mod) => mod.KLineChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
        <span className="animate-pulse">加载图表中...</span>
      </div>
    ),
  }
);

interface KLineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Position {
  stockCode: string;
  stockName: string;
  avgCost: number;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlRate: number;
}

interface Account {
  balance: number;
  totalAssets: number;
  dailyPnl: number;
}

function formatMoney(v: number): string {
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPnl(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${formatMoney(v)}`;
}

interface StockItem {
  code: string;
  name: string | null;
}

const HOT_STOCKS = ["000001", "600519", "300750", "002594", "601318", "000858"];

export default function TradePage() {
  const [stockCode, setStockCode] = useState("");
  const [klines, setKlines] = useState<KLineData[]>([]);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [preClose, setPreClose] = useState<number | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [stockName, setStockName] = useState("");

  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");

  const [account, setAccount] = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Array<{
    id: string; stockCode: string; stockName: string | null;
    type: string; price: number; quantity: number; status: string;
    fee: number; tax: number; createdAt: string;
  }>>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 股票搜索下拉
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 计算涨跌
  const priceChange = useMemo(() => {
    if (latestPrice == null || preClose == null) return null;
    const change = latestPrice - preClose;
    const pct = (change / preClose) * 100;
    return { change, pct };
  }, [latestPrice, preClose]);

  const searchStock = useCallback(async (codeOverride?: string) => {
    const code = (codeOverride ?? stockCode).trim();
    if (!code || code.length < 6) return;
    setLoadingChart(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/stocks?code=${code}&range=90d`);
      if (!res.ok) throw new Error("查询失败");
      const data = await res.json();
      setKlines(data.klines || []);
      setLatestPrice(data.latestPrice ?? null);
      setStockName(data.name || code);
      if (data.klines && data.klines.length >= 2) {
        setPreClose(data.klines[data.klines.length - 2].close);
      } else {
        setPreClose(null);
      }
      if (data.latestPrice) {
        setOrderPrice(data.latestPrice.toFixed(2));
      }
    } catch {
      setMessage({ type: "error", text: "行情加载失败，请检查股票代码" });
      setKlines([]);
      setLatestPrice(null);
    } finally {
      setLoadingChart(false);
    }
  }, [stockCode]);

  const loadAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/trade");
      if (!res.ok) return;
      const data = await res.json();
      setAccount(data.account);
      setPositions(data.positions || []);
      setOrders(data.orders || []);
    } catch {
      // 静默
    }
  }, []);

  // 加载股票列表
  useEffect(() => {
    fetch("/api/stocks?action=list")
      .then((r) => r.json())
      .then((d) => setStockList(d.stocks || []))
      .catch(() => {});
  }, []);

  // 按关键词过滤股票
  const filteredStocks = useMemo(() => {
    if (!searchKeyword.trim()) return stockList;
    const kw = searchKeyword.toLowerCase();
    return stockList.filter(
      (s) =>
        s.code.includes(kw) ||
        (s.name && s.name.toLowerCase().includes(kw))
    );
  }, [stockList, searchKeyword]);

  // 选中股票
  const selectStock = useCallback(
    (code: string, name: string | null) => {
      setStockCode(code);
      setStockName(name || code);
      setSearchKeyword("");
      setDropdownOpen(false);
      searchStock(code);
    },
    [searchStock]
  );

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function handleOrder() {
    setMessage(null);
    const price = parseFloat(orderPrice);
    const quantity = parseInt(orderQuantity);

    if (!stockCode || isNaN(price) || isNaN(quantity) || quantity <= 0) {
      setMessage({ type: "error", text: "请填写有效的价格和数量" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode: stockCode.trim(),
          stockName,
          type: orderType,
          price,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "交易失败" });
      } else {
        setMessage({
          type: "success",
          text: `${orderType === "buy" ? "买入" : "卖出"}成功${data.realizedPnl != null ? `，实现盈亏 ¥${data.realizedPnl.toFixed(2)}` : ""}`,
        });
        loadAccount();
        setOrderQuantity("");
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSubmitting(false);
    }
  }

  const estimatedFee = useMemo(() => {
    const price = parseFloat(orderPrice);
    const qty = parseInt(orderQuantity);
    if (isNaN(price) || isNaN(qty) || qty <= 0) return null;

    const amount = price * qty;
    const feeRate = 0.00025;
    let fee = amount * feeRate;
    if (fee < 5) fee = 5;
    fee = Math.round(fee * 100) / 100;
    const tax = orderType === "sell" ? Math.round(amount * 0.1) / 100 : 0;

    return { amount, fee, tax, total: amount + fee + tax };
  }, [orderPrice, orderQuantity, orderType]);

  return (
    <div className="space-y-5">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">模拟交易</h2>
          <p className="text-sm text-muted-foreground mt-0.5">真实行情驱动 · 初始资金 ¥200,000</p>
        </div>
        {stockCode && latestPrice && (
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm text-muted-foreground">{stockCode}</p>
              <p className="text-2xl font-bold font-mono tabular-nums">¥{latestPrice.toFixed(2)}</p>
            </div>
            {priceChange && (
              <div
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  priceChange.change >= 0
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-600"
                }`}
              >
                {priceChange.change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-mono tabular-nums">
                  {priceChange.change >= 0 ? "+" : ""}
                  {priceChange.change.toFixed(2)}
                </span>
                <span className="font-mono tabular-nums">
                  ({priceChange.change >= 0 ? "+" : ""}
                  {priceChange.pct.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 消息提示 */}
      {message && (
        <Alert
          variant={message.type === "error" ? "destructive" : "default"}
          className={
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : undefined
          }
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* 账户概览 */}
      {account && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Wallet className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600/70 font-medium">可用资金</p>
                  <p className="text-lg font-bold text-blue-900 tabular-nums">
                    ¥{formatMoney(account.balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600/70 font-medium">总资产</p>
                  <p className="text-lg font-bold text-emerald-900 tabular-nums">
                    ¥{formatMoney(account.totalAssets)}
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
                  <p className="text-lg font-bold text-violet-900 tabular-nums">
                    {positions.length} 只
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br shadow-sm ${
            (account.dailyPnl || 0) >= 0
              ? "from-red-50 to-red-100/50 border-red-100"
              : "from-green-50 to-green-100/50 border-green-100"
          }`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    (account.dailyPnl || 0) >= 0 ? "bg-red-500/10" : "bg-green-500/10"
                  }`}
                >
                  <ArrowUpDown
                    className={`h-4.5 w-4.5 ${
                      (account.dailyPnl || 0) >= 0 ? "text-red-600" : "text-green-600"
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-xs font-medium ${
                    (account.dailyPnl || 0) >= 0 ? "text-red-600/70" : "text-green-600/70"
                  }`}>
                    今日盈亏
                  </p>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      (account.dailyPnl || 0) >= 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    ¥{formatPnl(account.dailyPnl || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm relative">
            <Label className="text-xs text-muted-foreground mb-1.5 block">股票代码 / 名称</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Input
                placeholder="输入代码或名称搜索..."
                value={searchKeyword || stockCode}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && stockCode.length >= 6) {
                    searchStock();
                    setDropdownOpen(false);
                    setSearchKeyword("");
                  }
                }}
                className="pl-9 font-mono"
              />
              {/* 下拉列表 */}
              {dropdownOpen && filteredStocks.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
                  {filteredStocks.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      onMouseDown={() => selectStock(s.code, s.name)}
                    >
                      <span className="font-mono font-semibold text-blue-600 text-sm">
                        {s.code}
                      </span>
                      {s.name && (
                        <span className="text-sm text-gray-600">{s.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button onClick={() => searchStock()} disabled={loadingChart || stockCode.length < 6} className="gap-2">
            {loadingChart ? (
              <span className="animate-pulse">加载中...</span>
            ) : (
              <>
                <Search className="h-4 w-4" />
                查询
              </>
            )}
          </Button>
          {klines.length > 0 && (
            <p className="text-xs text-muted-foreground pb-2">
              共 {klines.length} 根 K 线
            </p>
          )}
        </div>

        {/* 热门股票快捷入口 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">热门：</span>
          {HOT_STOCKS.map((code) => {
            const item = stockList.find((s) => s.code === code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => selectStock(code, item?.name || null)}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <span className="font-mono font-medium">{code}</span>
                {item?.name && (
                  <span className="text-gray-500">{item.name}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* K 线图 */}
        <Card className="lg:col-span-2 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {latestPrice ? (
                  <>
                    <span className="font-mono">{stockCode}</span>
                    {stockName && stockName !== stockCode && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {stockName}
                      </span>
                    )}
                  </>
                ) : (
                  "K 线图"
                )}
              </CardTitle>
            </div>
            {latestPrice && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  开{" "}
                  <span className="font-mono text-foreground font-medium">
                    {klines[klines.length - 1]?.open?.toFixed(2) || "-"}
                  </span>
                </span>
                <span>
                  高{" "}
                  <span className="font-mono text-red-600 font-medium">
                    {klines[klines.length - 1]?.high?.toFixed(2) || "-"}
                  </span>
                </span>
                <span>
                  低{" "}
                  <span className="font-mono text-green-600 font-medium">
                    {klines[klines.length - 1]?.low?.toFixed(2) || "-"}
                  </span>
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {klines.length > 0 ? (
              <div className="px-1 pb-1">
                <KLineChart data={klines} height={480} />
              </div>
            ) : (
              <div className="flex h-[480px] items-center justify-center bg-gray-50/50 text-sm text-muted-foreground">
                {loadingChart ? (
                  <span className="animate-pulse">加载中...</span>
                ) : (
                  <div className="text-center">
                    <Search className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                    <p>输入股票代码查看 K 线图</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 下单面板 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">下单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={orderType}
              onValueChange={(v) => setOrderType(v as "buy" | "sell")}
            >
              <TabsList className="w-full h-10">
                <TabsTrigger
                  value="buy"
                  className="flex-1 data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
                >
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  买入
                </TabsTrigger>
                <TabsTrigger
                  value="sell"
                  className="flex-1 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
                >
                  <TrendingDown className="mr-1.5 h-4 w-4" />
                  卖出
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">价格</Label>
                  <button
                    type="button"
                    onClick={() => latestPrice && setOrderPrice(latestPrice.toFixed(2))}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    填最新价
                  </button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">数量（股）</Label>
                <Input
                  type="number"
                  step="100"
                  min="100"
                  placeholder="100"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  1 手 = 100 股 · 最小交易单位 100 股
                </p>
              </div>
            </div>

            {/* 费用预估 */}
            {estimatedFee && (
              <div className="rounded-xl bg-gray-50 p-3.5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">成交金额</span>
                  <span className="font-mono font-medium">
                    ¥{formatMoney(estimatedFee.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">手续费（万 2.5）</span>
                  <span className="font-mono">¥{estimatedFee.fee.toFixed(2)}</span>
                </div>
                {orderType === "sell" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">印花税（千 1）</span>
                    <span className="font-mono">¥{estimatedFee.tax.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>{orderType === "buy" ? "需支付" : "预计到账"}</span>
                  <span className="font-mono">
                    ¥{formatMoney(
                      orderType === "buy"
                        ? estimatedFee.total
                        : estimatedFee.amount - estimatedFee.fee - estimatedFee.tax
                    )}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full h-11 text-sm font-semibold"
              variant={orderType === "buy" ? "default" : "destructive"}
              onClick={handleOrder}
              disabled={submitting || !latestPrice}
            >
              {submitting
                ? "提交中..."
                : orderType === "buy"
                ? "确认买入"
                : "确认卖出"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 持仓列表 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Coins className="h-4.5 w-4.5 text-amber-600" />
            我的持仓
            {positions.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({positions.length} 只)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <PieChart className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm">暂无持仓</p>
              <p className="text-xs text-gray-400 mt-1">
                搜索股票并下单，开始你的第一笔交易
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50 text-left">
                    <th className="py-3 pl-4 pr-2 font-medium text-muted-foreground text-xs">
                      证券
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">
                      成本
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">
                      现价
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">
                      数量
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">
                      市值
                    </th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">
                      盈亏
                    </th>
                    <th className="py-3 pr-4 pl-2 font-medium text-muted-foreground text-xs text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <tr
                      key={pos.stockCode}
                      className="border-b last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setStockCode(pos.stockCode);
                        setStockName(pos.stockName || pos.stockCode);
                        setOrderPrice(pos.currentPrice.toFixed(2));
                        searchStock(pos.stockCode);
                      }}
                    >
                      <td className="py-3.5 pl-4 pr-2">
                        <div>
                          <span className="font-mono font-semibold text-blue-600">{pos.stockCode}</span>
                          {pos.stockName && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {pos.stockName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono tabular-nums">
                        ¥{pos.avgCost.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono tabular-nums">
                        ¥{pos.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono tabular-nums">
                        {pos.quantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono tabular-nums font-medium">
                        ¥{formatMoney(pos.marketValue)}
                      </td>
                      <td className="py-3.5 px-2 text-right font-mono tabular-nums">
                        <span
                          className={
                            pos.pnl >= 0 ? "text-red-600" : "text-green-600"
                          }
                        >
                          {formatPnl(pos.pnl)}
                        </span>
                        <span
                          className={`text-xs ml-1.5 ${
                            pos.pnlRate >= 0 ? "text-red-500" : "text-green-500"
                          }`}
                        >
                          {pos.pnlRate >= 0 ? "+" : ""}
                          {pos.pnlRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 pl-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStockCode(pos.stockCode);
                            setStockName(pos.stockName || pos.stockCode);
                            setOrderType("sell");
                            setOrderPrice(pos.currentPrice.toFixed(2));
                            searchStock(pos.stockCode);
                          }}
                        >
                          卖出
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最近成交 */}
      {orders.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpDown className="h-4.5 w-4.5 text-gray-500" />
              最近成交
              <span className="text-sm font-normal text-muted-foreground">
                ({orders.length} 笔)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50 text-left">
                    <th className="py-3 pl-4 pr-2 font-medium text-muted-foreground text-xs">时间</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs">证券</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-center">类型</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">价格</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">数量</th>
                    <th className="py-3 px-2 font-medium text-muted-foreground text-xs text-right">金额</th>
                    <th className="py-3 pr-4 pl-2 font-medium text-muted-foreground text-xs text-right">费用</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 20).map((o) => {
                    const amount = o.price * o.quantity;
                    const totalFee = Number(o.fee) + Number(o.tax);
                    const isBuy = o.type === "buy";
                    return (
                      <tr
                        key={o.id}
                        className="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 pl-4 pr-2 text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(o.createdAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-mono font-medium">{o.stockCode}</span>
                          {o.stockName && (
                            <span className="ml-1.5 text-xs text-muted-foreground">{o.stockName}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              isBuy
                                ? "bg-red-50 text-red-700"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {isBuy ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {isBuy ? "买入" : "卖出"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums">
                          ¥{o.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums">
                          {o.quantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-medium">
                          ¥{fmt(amount)}
                        </td>
                        <td className="py-3 pr-4 pl-2 text-right font-mono tabular-nums text-xs text-muted-foreground">
                          ¥{totalFee.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
