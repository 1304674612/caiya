"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RiskAcknowledgementPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAcknowledge() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/compliance/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageKey: "risk_disclaimer" }),
    });

    if (!res.ok) {
      setError("确认失败，请重试");
      setLoading(false);
      return;
    }

    await update();
    router.push("/trade");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">投资风险告知书</CardTitle>
          <CardDescription>使用财芽前，请仔细阅读以下声明</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none space-y-4 rounded-lg bg-muted/50 p-6 text-sm leading-relaxed">
            <h2 className="text-lg font-semibold">重要提示</h2>
            <p>
              财芽（CaiYa）是一个<strong>投资理财学习平台</strong>
              ，仅供教育学习用途。
            </p>

            <h2 className="text-lg font-semibold">风险声明</h2>
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                <strong>模拟交易非真实投资</strong>
                ：本平台提供的模拟交易功能使用虚拟资金，不涉及真实资金往来。
              </li>
              <li>
                <strong>市场风险</strong>
                ：股票、基金等金融产品存在价格波动风险，过往业绩不预示未来表现。
              </li>
              <li>
                <strong>AI 分析仅供参考</strong>
                ：AI 分析结果不构成任何投资建议，可能存在错误或偏差。
              </li>
              <li>
                <strong>非投资顾问</strong>
                ：本平台及其运营方不是持牌投资顾问机构，任何内容均不构成投资建议。
              </li>
              <li>
                <strong>盈亏自负</strong>
                ：因参考本平台内容而产生的任何投资盈亏，均由用户自行承担。
              </li>
            </ol>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            onClick={handleAcknowledge}
            disabled={loading}
          >
            {loading ? "处理中..." : "我已阅读并同意以上条款"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            点击即表示您确认理解投资风险，并知晓本平台仅供学习用途
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
