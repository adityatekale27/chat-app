// // app/api/call/answer/route.ts
// import { pusherServer } from "@/libs/pusher/pusherServer";
// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   const { callId, conversationId, answer, fromUserId } = await req.json();

//   try {
//     await pusherServer.trigger(`private-call-${conversationId}`, "answer", {
//       answer,
//       callId,
//       fromUserId,
//     });
//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Answer endpoint error:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
