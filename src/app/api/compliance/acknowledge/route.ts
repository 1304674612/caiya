import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acknowledge } from "@/lib/compliance";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const { messageKey } = await req.json();
  if (!messageKey) {
    return NextResponse.json({ message: "缺少参数" }, { status: 400 });
  }

  try {
    await acknowledge(session.user.id, messageKey);
    return NextResponse.json({ message: "确认成功" });
  } catch {
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}
