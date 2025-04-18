// // app/api/call/offer/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import prisma from '@/libs//prismadb'
// import { pusherServer } from "@/libs/pusher/pusherServer";

// export async function POST(req: NextRequest) {
//   const { fromUserId, toUserId, conversationId, offer } = await req.json();

//   try {
//     const call = await prisma.call.create({
//       data: {
//         callerId: fromUserId,
//         calleeId: toUserId,
//         conversationId,
//         type: "AUDIO",
//       },
//     });

//     await pusherServer.trigger(`private-call-${conversationId}`, "offer", {
//       offer,
//       callId: call.id,
//       fromUserId,
//     });

//     return NextResponse.json({ callId: call.id });
//   } catch (error) {
//     console.error("Offer endpoint error:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
