import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const session = JSON.parse(sessionCookie.value);
    
    // Fetch fresh user data (specifically the balance)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        role: true,
        balance: true,
        scoreGoal: true,
      }
    });

    if (!user) {
      // Session user no longer exists in DB
      const store = await cookies();
      store.delete("session");
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
