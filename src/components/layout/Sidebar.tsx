"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  Bot,
  User,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/trade", label: "模拟交易", icon: TrendingUp },
  { href: "/forum", label: "论坛社区", icon: MessageSquare },
  { href: "/learn", label: "课程学习", icon: GraduationCap },
  { href: "/ai", label: "AI 分析", icon: Bot },
  { href: "/backtest", label: "策略回测", icon: BarChart3 },
  { href: "/profile", label: "个人中心", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <span className="text-2xl">🌱</span>
        <span className="text-lg font-bold text-emerald-700">财芽</span>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
