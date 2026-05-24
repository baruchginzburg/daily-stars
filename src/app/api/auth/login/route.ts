import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { userId, passcode } = await request.json();

    if (!userId || !passcode) {
      return NextResponse.json({ error: "Missing user ID or passcode" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.passcode !== passcode) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    const sessionData = {
      userId: user.id,
      name: user.name,
      role: user.role,
      balance: user.balance,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
