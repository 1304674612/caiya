import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "published" };
  if (category && ["discussion", "review", "blog"].includes(category)) {
    where.category = category;
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const { title, content, category, tags } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ message: "标题不能为空" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ message: "标题最长 200 个字符" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ message: "内容不能为空" }, { status: 400 });
  }
  if (!["discussion", "review", "blog"].includes(category)) {
    return NextResponse.json({ message: "无效的分类" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      category,
      tags: Array.isArray(tags) ? tags.slice(0, 5) : [],
      authorId: session.user.id!,
      status: "published",
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
