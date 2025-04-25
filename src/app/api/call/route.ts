import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/actions/getCurrentUser";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
  }

  try {
    const calls = await prisma.call.findMany({
      where: {
        OR: [{ calleeId: currentUser?.id }, { callerId: currentUser?.id }],
      },
      include: {
        callee: true,
        caller: true,
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("GET /api/call error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
