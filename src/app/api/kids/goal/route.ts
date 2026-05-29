import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie || !sessionCookie.value) return null;
  
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kidId, scoreGoal } = await request.json();

    if (scoreGoal === undefined) {
      return NextResponse.json({ error: "Missing scoreGoal" }, { status: 400 });
    }

    const targetGoal = Math.max(0, parseInt(scoreGoal, 10));
    if (isNaN(targetGoal)) {
      return NextResponse.json({ error: "Invalid scoreGoal value" }, { status: 400 });
    }

    // Determine target user ID to update
    const targetUserId = kidId || session.userId;

    // Permissions check: User can only update their own goal, ADMIN can update any
    if (session.role !== "ADMIN" && session.userId !== targetUserId) {
      return NextResponse.json({ error: "Unauthorized to update this goal" }, { status: 403 });
    }

    // Update the database
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { scoreGoal: targetGoal },
      select: {
        id: true,
        name: true,
        role: true,
        balance: true,
        scoreGoal: true,
      },
    });

    // If the kid updated their own goal, we should update the session cookie
    if (session.userId === targetUserId) {
      const updatedSession = {
        ...session,
        balance: updatedUser.balance,
        scoreGoal: updatedUser.scoreGoal,
      };
      
      const cookieStore = await cookies();
      cookieStore.set("session", JSON.stringify(updatedSession), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
