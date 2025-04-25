import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";

export async function POST(request: NextRequest) {
  const { fromUserId, toUserId, conversationId, offer, callType } = await request.json();

  // Validate the destructured data
  if (!fromUserId || !toUserId || !conversationId || !offer || !callType) {
    console.log("Missing required fields in call offer", { fromUserId, toUserId, conversationId, callType });
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  try {
    /* Create new call using destructured data */
    const call = await prisma.call.create({
      data: {
        callerId: fromUserId,
        calleeId: toUserId,
        conversationId,
        type: callType,
        startedAt: new Date(),
        status: "CONNECTING",
      },
    });
    
    const participants = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { users: true },
    });

    /* Trigger pusher event for offer on private call with conversation id */
    if (participants) {
      await Promise.all(
        participants?.users.map((user) =>
          pusherServer.trigger(`private-user-${user.id}`, "offer", {
            offer,
            callId: call.id,
            fromUserId,
            callType,
            conversationId,
            status: call.status,
            user
          })
        )
      );
    }

    return NextResponse.json({ callId: call.id, status: call.id }, { status: 200 });
  } catch (error) {
    console.error("POST /call/offer error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
