"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "discussion", label: "行情讨论" },
  { value: "review", label: "复盘分享" },
  { value: "blog", label: "大佬博客" },
];

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("discussion");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    const res = await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
    });

    if (res.ok) {
      toast.success("帖子发布成功！");
      router.push("/forum");
      router.refresh();
    } else {
      toast.error("发布失败，请重试");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">发布帖子</h2>
        <p className="text-sm text-muted-foreground mt-0.5">分享你的观点与复盘</p>
      </div>

      <Card className="shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">撰写帖子</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                placeholder="一句话概括你的帖子内容"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>分类</Label>
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={category === cat.value ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5"
                    onClick={() => setCategory(cat.value)}
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                placeholder="分享你的投资心得、K 线分析或复盘思考..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="resize-y min-h-[200px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                支持 Markdown 格式：**加粗**、*斜体*、- 列表、{">"} 引用
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "发布中..." : "发布帖子"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
