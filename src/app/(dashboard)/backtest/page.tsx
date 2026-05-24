"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Play, TrendingUp, Target, AlertTriangle, Loader2, Info } from "lucide-react";

const STRATEGIES = [
  {
    id: "ma-cross",
    name: "均线金叉/死叉",
    desc: "短期均线上穿长期均线买入，下穿卖出。适合趋势行情。",
    icon: TrendingUp,
    params: [
      { label: "短期均线周期", key: "fast", defaultValue: "5" },
      { label: "长期均线周期", key: "slow", defaultValue: "20" },
    ],
  },
  {
    id: "rsi",
    name: "RSI 超买超卖",
    desc: "RSI 低于超卖线买入，高于超买线卖出。适合震荡行情。",
    icon: Target,
    params: [
      { label: "RSI 周期", key: "period", defaultValue: "14" },
      { label: "超卖线", key: "oversold", defaultValue: "30" },
      { label: "超买线", key: "overbought", defaultValue: "70" },
    ],
  },
  {
    id: "macd",
    name: "MACD 金叉",
    desc: "MACD 线上穿信号线买入，下穿卖出。经典趋势跟踪策略。",
    icon: BarChart3,
    params: [
      { label: "快线周期", key: "fast", defaultValue: "12" },
      { label: "慢线周期", key: "slow", defaultValue: "26" },
      { label: "信号线周期", key: "signal", defaultValue: "9" },
    ],
  },
];

interface BacktestResult {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  avgHoldDays: number;
  dataPoints: number;
  stockCode: string;
  startDate: string;
  endDate: string;
  strategy: string;
}

export default function BacktestPage() {
  const [selected, setSelected] = useState(STRATEGIES[0]);
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(STRATEGIES[0].params.map((p) => [p.key, p.defaultValue]))
  );
  const [stockCode, setStockCode] = useState("000001");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [capital, setCapital] = useState("100000");
  const [frequency, setFrequency] = useState("daily");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectStrategy(s: (typeof STRATEGIES)[0]) {
    setSelected(s);
    setParams(Object.fromEntries(s.params.map((p) => [p.key, p.defaultValue])));
    setResults(null);
  }

  function updateParam(key: string, value: string) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  async function runBacktest() {
    setRunning(true);
    setResults(null);
    setError(null);

    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode,
          startDate,
          endDate,
          strategy: selected.id,
          params,
          capital,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "回测失败");
      } else {
        setResults(data);
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">策略回测</h2>
        <p className="text-sm text-muted-foreground mt-0.5">用历史数据验证你的交易策略，量化评估策略表现</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">策略配置</CardTitle>
              <CardDescription>选择策略类型，设置参数和回测标的</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 策略选择 */}
              <div className="grid gap-3 sm:grid-cols-3">
                {STRATEGIES.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                      selected.id === s.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                    onClick={() => selectStrategy(s)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* 参数 */}
              <div className="grid gap-3 sm:grid-cols-3">
                {selected.params.map((p) => (
                  <div key={p.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{p.label}</label>
                    <Input
                      value={params[p.key] || ""}
                      onChange={(e) => updateParam(p.key, e.target.value)}
                      className="h-8 font-mono"
                    />
                  </div>
                ))}
              </div>

              {/* 股票和回测区间 */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">回测标的</label>
                  <Input
                    placeholder="000001"
                    className="h-8 font-mono"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">起始日期</label>
                  <Input
                    type="date"
                    className="h-8 font-mono"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">结束日期</label>
                  <Input
                    type="date"
                    className="h-8 font-mono"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">初始资金</label>
                  <Input
                    className="h-8 font-mono w-[160px]"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                  />
                </div>
                <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                  <SelectTrigger className="h-8 w-[140px] self-end">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">日线</SelectItem>
                    <SelectItem value="weekly">周线</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={runBacktest} disabled={running || stockCode.length !== 6}>
                {running ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    回测中...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    开始回测
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 回测结果 */}
          {error && (
            <Card className="shadow-sm border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {results && (
            <Card className="shadow-sm border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">
                  {selected.name} 回测结果
                </CardTitle>
                <CardDescription>
                  {results.stockCode} | {results.startDate} 至 {results.endDate} | {results.dataPoints} 条数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className={`rounded-lg p-4 ${results.totalReturn >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                    <p className={`text-xs font-medium ${results.totalReturn >= 0 ? "text-emerald-600/70" : "text-red-600/70"}`}>
                      累计收益率
                    </p>
                    <p className={`text-2xl font-bold tabular-nums ${results.totalReturn >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {results.totalReturn >= 0 ? "+" : ""}{results.totalReturn}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs text-blue-600/70 font-medium">胜率</p>
                    <p className="text-2xl font-bold text-blue-700 tabular-nums">{results.winRate}%</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <p className="text-xs text-amber-600/70 font-medium">最大回撤</p>
                    <p className="text-2xl font-bold text-amber-700 tabular-nums">{results.maxDrawdown}%</p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-4">
                    <p className="text-xs text-violet-600/70 font-medium">夏普比率</p>
                    <p className="text-2xl font-bold text-violet-700 tabular-nums">{results.sharpeRatio}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-4">
                    <p className="text-xs text-rose-600/70 font-medium">交易次数</p>
                    <p className="text-2xl font-bold text-rose-700 tabular-nums">{results.totalTrades}</p>
                  </div>
                  <div className="rounded-lg bg-teal-50 p-4">
                    <p className="text-xs text-teal-600/70 font-medium">平均持仓天数</p>
                    <p className="text-2xl font-bold text-teal-700 tabular-nums">{results.avgHoldDays} 天</p>
                  </div>
                </div>
                <Alert className="mt-4 border-amber-200 bg-amber-50">
                  <Info className="h-3.5 w-3.5 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-700">
                    以上为模拟回测结果。历史表现不代表未来收益，实际交易存在滑点和流动性风险。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                风险提示
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>历史回测不代表未来收益。策略在历史数据上的表现可能存在过拟合。</p>
              <p>回测结果未考虑滑点、流动性冲击、涨跌停限制等实际交易成本。</p>
              <p>建议结合多周期、多标的交叉验证，避免过度优化单一参数组合。</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">策略说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {STRATEGIES.map((s) => (
                <div key={s.id} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-sm font-medium">{s.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.params.length} 个参数
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
