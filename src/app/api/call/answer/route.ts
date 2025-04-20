import { pusherServer } from "@/libs/pusher/pusherServer";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function POST(request: NextRequest) {
  const { callId, conversationId, answer, fromUserId } = await request.json();

  /* Validate destructured data */
  if (!callId || !conversationId || !answer || !fromUserId) {
    console.log("Missing required data in call answer", { callId, conversationId, fromUserId });
    return NextResponse.json({ message: "Missing required data" }, { status: 400 });
  }

  try {
    // Verify the call exists and update its status
    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      console.log(`Call not found: ${callId}`);
      return NextResponse.json({ message: "Call not found" }, { status: 404 });
    }

    // Update call status
    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        status: "ONGOING",
        answeredAt: new Date(),
      },
    });

    console.log(`Call answered: ${callId} by ${fromUserId}`);

    /* Trigger pusher event for answer on private call with conversation id */
    await pusherServer.trigger(`private-call-${conversationId}`, "answer", {
      answer,
      callId,
      fromUserId,
      status: updatedCall.status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /call/answer error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
