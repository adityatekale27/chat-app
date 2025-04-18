import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";

export async function GET() {
  try {
    // Users inactive for more than 2 minutes will be marked offline
    const thresholdTime = new Date(Date.now() - 2 * 60 * 1000);

    /**
     * Find all users who are currently marked online,
     * but whose lastOnline is before the threshold
     */
    const inactiveUsers = await prisma.user.findMany({
      where: {
        isOnline: true,
        lastOnline: { lt: thresholdTime },
      },
      select: { id: true, name: true },
    });

    if (inactiveUsers.length === 0) {
      return NextResponse.json({ message: "No inactive users found." });
    }

    const userIds = [...new Set(inactiveUsers.map((user) => user.id))];

    // Update the found users to mark them offline
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isOnline: false, lastOnline: new Date() },
    });

    /* Trigger Pusher events for these users */
    await Promise.all(
      userIds.map((id) =>
        pusherServer.trigger("online-presence", "friend-online", { userId: id, isOnline: false }).catch((err) => console.error(`Failed to trigger Pusher for ${id}`, err))
      )
    );

    return NextResponse.json({ message: "Inactive users marked offline", userIds, inactiveUsers });
  } catch (error) {
    console.error("Error marking inactive users offline:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
