import { pusherServer } from "@/libs/pusher/pusherServer";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function POST(request: NextRequest) {
  try {
    const { callId, conversationId, fromUserId } = await request.json();

    /* Validate destructured data */
    if (!callId || !conversationId || !fromUserId) {
      console.log("Missing required data in call end", { callId, conversationId, fromUserId });
      return NextResponse.json({ message: "Missing required data" }, { status: 400 });
    }

    // Verify the call exists
    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      console.log(`Call not found: ${callId}`);
      return NextResponse.json({ message: "Call not found" }, { status: 404 });
    }

    // Calculate call duration if it was answered
    let duration = null;
    if (call.answeredAt) {
      duration = Math.floor((Date.now() - call.answeredAt.getTime()) / 1000);
    }

    // Update call status
    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        status: duration === null ? "MISSED" : "ENDED",
        endedAt: new Date(),
        duration,
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
          pusherServer.trigger(`private-user-${user.id}`, "call-ended", {
            callId,
            fromUserId,
            status: updatedCall.status,
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /call/end error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
