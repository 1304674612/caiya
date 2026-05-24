import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">发布帖子</h2>
        <p className="text-muted-foreground">分享你的观点与复盘</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex h-[400px] items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
            发帖编辑器 — 待实现（第 3 周）
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
