"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, TrendingUp, BarChart3, LineChart, Brain, Shield, ChevronLeft, CheckCircle2, Circle } from "lucide-react";

interface Lesson {
  title: string;
  done: boolean;
}

interface Course {
  title: string;
  desc: string;
  level: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
  lessons: Lesson[];
}

const COURSES: Course[] = [
  {
    title: "K线入门",
    desc: "了解 K 线图的基本构成、阴阳线含义与常见反转形态",
    level: "入门",
    icon: TrendingUp,
    progress: 0,
    lessons: [
      { title: "什么是 K 线图", done: false },
      { title: "阳线与阴线", done: false },
      { title: "上影线与下影线", done: false },
      { title: "锤子线与倒锤子线", done: false },
      { title: "吞没形态", done: false },
      { title: "十字星形态", done: false },
      { title: "启明星与黄昏星", done: false },
      { title: "实战：识别 K 线组合", done: false },
    ],
  },
  {
    title: "PE 与 PB",
    desc: "市盈率与市净率的计算方法和应用场景，学会用估值指标判断股票是否便宜",
    level: "入门",
    icon: BarChart3,
    progress: 0,
    lessons: [
      { title: "什么是市盈率（PE）", done: false },
      { title: "PE 的计算方法", done: false },
      { title: "静态 PE vs 动态 PE", done: false },
      { title: "市净率（PB）入门", done: false },
      { title: "PE+PB 联合估值", done: false },
      { title: "行业对比分析", done: false },
    ],
  },
  {
    title: "均线系统",
    desc: "移动平均线（MA）的计算、金叉/死叉买卖信号，以及多头/空头排列判断趋势",
    level: "入门",
    icon: LineChart,
    progress: 0,
    lessons: [
      { title: "什么是移动平均线", done: false },
      { title: "5 日线与 20 日线", done: false },
      { title: "金叉买入信号", done: false },
      { title: "死叉卖出信号", done: false },
      { title: "多头排列与空头排列", done: false },
      { title: "均线支撑与压力", done: false },
      { title: "均线系统实战策略", done: false },
    ],
  },
  {
    title: "成交量分析",
    desc: "量价关系的八大形态，放量突破与缩量回调的实战含义，识别主力动向",
    level: "进阶",
    icon: BarChart3,
    progress: 0,
    lessons: [
      { title: "成交量基础概念", done: false },
      { title: "放量上涨与缩量上涨", done: false },
      { title: "放量下跌与缩量下跌", done: false },
      { title: "量价背离信号", done: false },
      { title: "主力资金动向识别", done: false },
    ],
  },
  {
    title: "交易心理学",
    desc: "追涨杀跌的心理陷阱、处置效应、过度自信等行为偏误以及应对策略",
    level: "进阶",
    icon: Brain,
    progress: 0,
    lessons: [
      { title: "追涨杀跌的心理根源", done: false },
      { title: "处置效应：为何总卖赚的留亏的", done: false },
      { title: "过度自信与频繁交易", done: false },
      { title: "建立交易纪律", done: false },
    ],
  },
  {
    title: "风险管理",
    desc: "仓位控制、止损止盈设置、最大回撤管理，学会保护本金",
    level: "进阶",
    icon: Shield,
    progress: 0,
    lessons: [
      { title: "为什么要做风险管理", done: false },
      { title: "仓位控制：每次买多少", done: false },
      { title: "止损设置方法", done: false },
      { title: "止盈策略", done: false },
      { title: "最大回撤控制", done: false },
      { title: "构建完整的交易计划", done: false },
    ],
  },
];

export default function LearnPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  if (selectedCourse) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setSelectedCourse(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回课程列表
        </Button>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <selectedCourse.icon className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{selectedCourse.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={selectedCourse.level === "入门" ? "secondary" : "outline"}>
                  {selectedCourse.level}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedCourse.lessons.length} 节课
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{selectedCourse.desc}</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">课程目录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {selectedCourse.lessons.map((lesson, i) => (
                <div
                  key={lesson.title}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-mono text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{lesson.title}</span>
                  {lesson.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
              课程内容正在持续更新中。完成全部课程后，你将具备独立进行技术分析和基本面分析的能力。
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">课程学习</h2>
        <p className="text-sm text-muted-foreground mt-0.5">从零开始学投资，{COURSES.length} 门课程 · {COURSES.reduce((s, c) => s + c.lessons.length, 0)} 节课</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((course) => (
          <Card
            key={course.title}
            className="shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setSelectedCourse(course)}
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
                  <span>{course.lessons.length} 节课</span>
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
