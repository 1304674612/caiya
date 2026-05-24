"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard 错误:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">出错了</h2>
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-6 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="mt-3 text-muted-foreground">
            {error.message || "页面加载失败，请稍后重试"}
          </p>
          <Button className="mt-4" onClick={() => reset()}>
            重试
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
