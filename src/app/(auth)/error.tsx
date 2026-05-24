"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth 错误:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="text-center max-w-md">
        <span className="text-4xl">⚠️</span>
        <h1 className="mt-4 text-xl font-bold text-gray-900">出错了</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "发生了意外错误"}
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button onClick={() => reset()}>重试</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/login")}>
            返回登录
          </Button>
        </div>
      </div>
    </div>
  );
}
