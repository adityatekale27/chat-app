import getCurrentUser from "@/actions/getCurrentUser";
import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { userId } = await request.json();

    if (!currentUser || currentUser.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Check if the user exists */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastOnline: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User does not exists" }, { status: 400 });
    }

    // get the current time and lastOnline time of the user
    const timeNow = Date.now();
    const lastOnlineTime = user.lastOnline ? new Date(user.lastOnline).getTime() : 0;

    /* Update the user lastOnline and isOnline */
    if (timeNow - lastOnlineTime > 60 * 1000) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastOnline: new Date(), isOnline: true },
      });
    }

    /* Trigger the pusher event */
    await pusherServer.trigger("online-presence", "friend-online", { userId: currentUser.id, isOnline: true });

    return NextResponse.json({ message: "Heartbeat received" });
  } catch (error) {
    console.log("heartbeat status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
