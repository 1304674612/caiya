import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  // TODO: 查询帖子列表（支持分类、分页）
  return NextResponse.json({ posts: [], total: 0, message: "论坛 API — 待实现" });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  // TODO: 创建帖子
  return NextResponse.json({ message: "发帖功能 — 待实现" }, { status: 201 });
}
