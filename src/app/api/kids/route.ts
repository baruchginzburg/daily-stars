import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

// Helper to check if request is from an admin
async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie || !sessionCookie.value) return null;
  
  try {
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== "ADMIN") return null;
    return session;
  } catch {
    return null;
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kids = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        name: true,
        role: true,
        balance: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(kids);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, passcode } = await request.json();

    if (!name || !passcode) {
      return NextResponse.json({ error: "Missing name or passcode" }, { status: 400 });
    }

    // Clean name
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }

    if (!/^\d{4}$/.test(passcode)) {
      return NextResponse.json({ error: "Passcode must be a 4-digit PIN" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json({ error: "Profile name already exists" }, { status: 400 });
    }

    const newKid = await prisma.user.create({
      data: {
        name: trimmedName,
        role: "USER",
        passcode: passcode,
        balance: 0,
      },
      select: {
        id: true,
        name: true,
        role: true,
        balance: true,
      },
    });

    return NextResponse.json(newKid);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const kidId = searchParams.get("id");

    if (!kidId) {
      return NextResponse.json({ error: "Missing kid ID" }, { status: 400 });
    }

    // Check if kid exists
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.role !== "USER") {
      return NextResponse.json({ error: "Kid profile not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: kidId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
