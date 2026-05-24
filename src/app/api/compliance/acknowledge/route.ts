import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acknowledge } from "@/lib/compliance";
import { acknowledgeSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = acknowledgeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    await acknowledge(session.user.id, parsed.data.messageKey);
    return NextResponse.json({ message: "确认成功" });
  } catch {
    return NextResponse.json({ message: "服务器错误" }, { status: 500 });
  }
}
