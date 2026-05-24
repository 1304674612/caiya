"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Bot, Search, Zap, ShieldAlert,
  Eye, EyeOff, Trash2, Loader2,
} from "lucide-react";

const STOCK_NAMES: Record<string, string> = {
  "000001": "平安银行", "600519": "贵州茅台", "300750": "宁德时代",
  "002594": "比亚迪", "601318": "中国平安", "000858": "五粮液",
};

const MOCK_ANALYSIS = `## 000001 平安银行 技术分析

### 技术面
- **趋势判断**：股价处于 13.3-13.6 区间震荡整理，短期方向待选择
- **均线系统**：5 日线上穿 20 日线形成金叉，中期趋势偏多
- **量价关系**：近期成交量温和放大，显示有资金关注
- **支撑位/压力位**：支撑 13.00 / 压力 14.20

### 基本面
- PE 约 5.2 倍，处于银行板块中等偏低水平
- PB 约 0.65 倍，破净状态，安全边际较高
- 不良贷款率稳中有降，资产质量改善

### 风险提示
- 宏观经济下行压力可能影响银行资产质量
- 净息差收窄趋势尚未逆转
- 以上分析不构成投资建议，请独立思考`;

export default function AIPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [stockCode, setStockCode] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [tab, setTab] = useState("stock");

  function saveApiKey() {
    if (!apiKey.trim()) return;
    localStorage.setItem("caiya_ai_apikey", apiKey.trim());
    setSavedKey(apiKey.trim());
    setApiKey("");
  }

  function removeApiKey() {
    localStorage.removeItem("caiya_ai_apikey");
    setSavedKey(null);
  }

  function loadApiKey() {
    const saved = localStorage.getItem("caiya_ai_apikey");
    if (saved) setSavedKey(saved);
  }

  useEffect(() => {
    loadApiKey();
  }, []);

  async function runAnalysis() {
    if (!stockCode.trim() || stockCode.trim().length !== 6) return;
    setAnalyzing(true);
    setAnalysis(null);

    // 模拟 AI 分析延迟
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    const name = STOCK_NAMES[stockCode.trim()] || stockCode.trim();
    setAnalysis(
      MOCK_ANALYSIS.replace("000001 平安银行", `${stockCode.trim()} ${name}`)
        .replace(/14\.20/g, (Math.random() * 5 + 12).toFixed(2))
        .replace(/13\.00/g, (Math.random() * 3 + 11).toFixed(2))
    );
    setAnalyzing(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI 分析</h2>
        <p className="text-sm text-muted-foreground mt-0.5">连接大模型，获取 AI 驱动的投资分析视角</p>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          AI 生成内容仅供学习参考，不构成投资建议。大模型可能存在幻觉和偏差，请独立思考。
        </AlertDescription>
      </Alert>

      {/* API Key 配置 */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-amber-600" />
            API Key 配置
          </CardTitle>
          <CardDescription>
            你的 API Key 仅存储在浏览器本地，不会上传到财芽服务器
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savedKey ? (
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                已配置
              </Badge>
              <code className="text-xs text-muted-foreground font-mono">
                {savedKey.slice(0, 8)}...{savedKey.slice(-4)}
              </code>
              <Button variant="outline" size="sm" onClick={removeApiKey}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                移除
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="relative flex-1 max-w-md">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  className="font-mono pr-10"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={saveApiKey} disabled={!apiKey.trim()}>
                保存
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            支持 OpenAI、Claude 等兼容 API。配置后即可使用 AI 分析功能。
          </p>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock">
            <Search className="h-3.5 w-3.5 mr-1" />
            个股分析
          </TabsTrigger>
          <TabsTrigger value="coach">
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            复盘教练
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "stock" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">个股分析</CardTitle>
            <CardDescription>输入股票代码，获取技术面与基本面分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="输入股票代码，如 000001"
                className="font-mono max-w-[200px]"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
              />
              <Button
                onClick={runAnalysis}
                disabled={analyzing || stockCode.length !== 6}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    分析中...
                  </>
                ) : (
                  "分析"
                )}
              </Button>
            </div>

            {analysis ? (
              <div className="rounded-lg border bg-gray-50 p-6">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-gray-800">
                  {analysis}
                </pre>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-6 text-center">
                <Bot className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-muted-foreground">输入股票代码，点击分析即可获取 AI 分析报告</p>
                <p className="text-xs text-gray-400 mt-1">
                  支持 K 线形态、均线趋势、量价关系等分析维度
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "coach" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-purple-600" />
              复盘教练
            </CardTitle>
            <CardDescription>分析你的交易记录，给出改进建议</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <Bot className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-muted-foreground">完成 5 笔以上交易后，复盘教练将分析你的交易行为</p>
              <p className="text-xs text-gray-400 mt-1">
                包括：买卖点评估、仓位管理评分、情绪化交易检测
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
