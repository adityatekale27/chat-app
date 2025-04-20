import { pusherServer } from "@/libs/pusher/pusherServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { callId, conversationId, candidate, fromUserId } = await request.json();

  /* Validate destructured data */
  if (!callId || !conversationId || !candidate || !fromUserId) {
    return NextResponse.json({ message: "Missing required data" }, { status: 400 });
  }

  try {
    /* Trigger pusher event for candidate on private call with conversation id */
    await pusherServer.trigger(`private-call-${conversationId}`, "candidate", {
      candidate,
      callId,
      fromUserId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /call/candidate error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
