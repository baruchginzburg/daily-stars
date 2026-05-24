import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

// Helper to get active session
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

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let kidId = searchParams.get("kidId");

  // Security check: USER (kid) can only view their own history
  if (session.role === "USER") {
    kidId = session.userId;
  }

  try {
    const whereClause: any = {};
    if (kidId) {
      whereClause.userId = kidId;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kidId, amount, description } = await request.json();

    if (!kidId || amount === undefined || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return NextResponse.json({ error: "Amount must be a non-zero integer" }, { status: 400 });
    }

    const cleanedDescription = description.trim();
    if (!cleanedDescription) {
      return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 });
    }

    // Check if kid exists
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.role !== "USER") {
      return NextResponse.json({ error: "Kid profile not found" }, { status: 404 });
    }

    // Run transaction: create transaction record and update user balance
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction
      const trans = await tx.transaction.create({
        data: {
          amount: parsedAmount,
          description: cleanedDescription,
          userId: kidId,
          createdById: session.userId,
        },
      });

      // 2. Update kid balance, clamping it at 0 to avoid negative score debt
      const newBalance = Math.max(0, kid.balance + parsedAmount);
      
      const updatedKid = await tx.user.update({
        where: { id: kidId },
        data: { balance: newBalance },
      });

      return { trans, newBalance: updatedKid.balance };
    });

    return NextResponse.json({
      success: true,
      transaction: result.trans,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
