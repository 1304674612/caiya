import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Bot, Search, Zap, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AIPage() {
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
          <div className="flex gap-3">
            <Input
              type="password"
              placeholder="sk-..."
              className="font-mono max-w-md"
              disabled
            />
            <Button disabled>保存</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            支持 OpenAI、Claude 等兼容 API。配置后即可使用 AI 分析功能。
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 个股分析 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-blue-600" />
              个股分析
            </CardTitle>
            <CardDescription>输入股票代码，获取技术面与基本面分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Input placeholder="输入股票代码" className="font-mono max-w-[180px]" disabled />
              <Button disabled>分析</Button>
            </div>
            <div className="rounded-lg bg-gray-50 p-6 text-center">
              <Bot className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-muted-foreground">配置 API Key 后即可使用 AI 个股分析</p>
              <p className="text-xs text-gray-400 mt-1">
                AI 将分析 K 线形态、均线趋势、量价关系等
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 复盘教练 */}
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
              <Link href="/trade">
                <Button variant="outline" size="sm" className="mt-4">
                  去模拟交易 →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
