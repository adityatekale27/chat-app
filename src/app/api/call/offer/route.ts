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

    console.log(`Call offer created: ${call.id} from ${fromUserId} to ${toUserId} in ${conversationId}`);

    /* Trigger pusher event for offer on private call with conversation id */
    await pusherServer.trigger(`private-call-${conversationId}`, "offer", {
      offer,
      callId: call.id,
      fromUserId,
      callType,
      status: call.status,
    });

    return NextResponse.json({ callId: call.id, status: call.id }, { status: 200 });
  } catch (error) {
    console.error("POST /call/offer error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
