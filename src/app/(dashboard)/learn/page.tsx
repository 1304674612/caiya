import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, TrendingUp, BarChart3, LineChart, Brain, Shield } from "lucide-react";

const COURSES = [
  {
    title: "K线入门",
    desc: "了解 K 线图的基本构成、阴阳线含义与常见反转形态（锤子线、吞没形态、十字星等）",
    level: "入门",
    icon: TrendingUp,
    progress: 0,
    lessons: 8,
  },
  {
    title: "PE 与 PB",
    desc: "市盈率与市净率的计算方法和应用场景，学会用估值指标判断股票是否便宜",
    level: "入门",
    icon: BarChart3,
    progress: 0,
    lessons: 6,
  },
  {
    title: "均线系统",
    desc: "移动平均线（MA）的计算、金叉/死叉买卖信号，以及多头/空头排列判断趋势",
    level: "入门",
    icon: LineChart,
    progress: 0,
    lessons: 7,
  },
  {
    title: "成交量分析",
    desc: "量价关系的八大形态，放量突破与缩量回调的实战含义，识别主力动向",
    level: "进阶",
    icon: BarChart3,
    progress: 0,
    lessons: 5,
  },
  {
    title: "交易心理学",
    desc: "追涨杀跌的心理陷阱、处置效应、过度自信等行为偏误以及应对策略",
    level: "进阶",
    icon: Brain,
    progress: 0,
    lessons: 4,
  },
  {
    title: "风险管理",
    desc: "仓位控制、止损止盈设置、最大回撤管理，学会保护本金",
    level: "进阶",
    icon: Shield,
    progress: 0,
    lessons: 6,
  },
];

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">课程学习</h2>
        <p className="text-sm text-muted-foreground mt-0.5">从零开始学投资，6 门课程 · 36 节课</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((course) => (
          <Card
            key={course.title}
            className="shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                  <course.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <Badge variant={course.level === "入门" ? "secondary" : "outline"}>
                  {course.level}
                </Badge>
              </div>
              <CardTitle className="text-base">{course.title}</CardTitle>
              <CardDescription className="line-clamp-2">{course.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{course.lessons} 节课</span>
                  <span>{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-1.5" />
              </div>
              <p className="text-xs text-emerald-600 mt-3 font-medium group-hover:underline">
                开始学习 →
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
