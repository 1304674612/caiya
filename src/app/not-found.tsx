import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <span className="text-5xl">🔍</span>
        <h1 className="mt-4 text-xl font-bold text-gray-900">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          你访问的页面可能已被移除或地址输入有误
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
