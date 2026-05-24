import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, Heart, Clock } from "lucide-react";
import Link from "next/link";

const MOCK_POSTS = [
  {
    id: "1",
    title: "000001 平安银行 K 线分析 — 底部放量企稳信号？",
    category: "行情讨论",
    author: "投资新手小明",
    replies: 12,
    views: 345,
    likes: 8,
    time: "2 小时前",
    preview: "平安银行最近一周在 13.3-13.6 区间窄幅震荡，今天成交量明显放大，是不是底部企稳的信号？大家怎么看？",
  },
  {
    id: "2",
    title: "复盘日记：今天追高 600519 茅台亏了 ¥2800，教训深刻",
    category: "复盘分享",
    author: "韭菜一号",
    replies: 24,
    views: 892,
    likes: 15,
    time: "5 小时前",
    preview: "看到茅台涨了 2% 就冲进去了，结果下午回调直接套住。反思：没有等回调确认就入场，犯了追高的老毛病。以后一定要严格执行买点纪律。",
  },
  {
    id: "3",
    title: "2024 年投资入门书单推荐 — 从零开始学投资",
    category: "大佬博客",
    author: "财芽小助手",
    replies: 36,
    views: 1205,
    likes: 42,
    time: "昨天",
    preview: "整理了 10 本适合新手的投资书籍：聪明的投资者、彼得林奇的成功投资、日本蜡烛图技术...",
  },
  {
    id: "4",
    title: "讨论：PE 和 PB 哪个更适合银行股估值？",
    category: "行情讨论",
    author: "价值投资者",
    replies: 18,
    views: 567,
    likes: 11,
    time: "昨天",
    preview: "银行股利润受拨备影响波动大，PE 可能失真。PB 看净资产更直观，但也要考虑不良率。大家选银行股主要看什么指标？",
  },
  {
    id: "5",
    title: "我的均线交易策略分享 — 5日线上穿20日线买入法",
    category: "复盘分享",
    author: "量化小王子",
    replies: 29,
    views: 1567,
    likes: 38,
    time: "2 天前",
    preview: "回测了 2023-2025 年的数据，5/20 金叉策略在沪深 300 上的胜率约 58%，最大回撤 12%。分享给大家参考。",
  },
];

const CATEGORIES = ["全部", "行情讨论", "复盘分享", "大佬博客"];

export default function ForumPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">论坛社区</h2>
          <p className="text-sm text-muted-foreground mt-0.5">行情讨论、复盘分享、投资交流</p>
        </div>
        <Link href="/forum/new" className={buttonVariants()}>
          发布帖子
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={cat === "全部" ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className="space-y-3">
        {MOCK_POSTS.map((post) => (
          <Card key={post.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold leading-snug hover:text-blue-600 transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="mt-1.5 line-clamp-2">{post.preview}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>
                <span>{post.author}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {post.time}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {post.replies}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {post.views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {post.likes}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
