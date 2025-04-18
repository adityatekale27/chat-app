import getCurrentUser from "@/actions/getCurrentUser";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  isOnline: true,
  lastOnline: true,
  username: true,
} as const;

type SeenResponse = {
  status: string;
  lastMessageId: string;
  seenMessage: User[];
};

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await request.json();
    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
    }

    /* Fetch conversation if the current user is part of it */
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userIds: { has: currentUser.id },
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          include: {
            seenMessage: { select: userSelect },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "No conversation found" }, { status: 404 });
    }

    /* Get the last message from the conversation */
    const lastMessage = conversation.messages[0];
    if (!lastMessage) {
      return NextResponse.json({ error: "No messages found" }, { status: 404 });
    }

    let updatedMessage = lastMessage;

    /* Only update if user hasn't seen the message */
    if (!lastMessage.seenMessage.some((user) => user.id === currentUser.id)) {
      updatedMessage = await prisma.message.update({
        where: { id: lastMessage.id },
        data: {
          seenMessage: { connect: { id: currentUser.id } },
          status: "SEEN",
        },
        include: { seenMessage: { select: userSelect }, sender: { select: userSelect } },
      });
    }

    console.log("updatedMessage", updatedMessage);

    /* Pusher event for seen message */
    await pusherServer.trigger(conversationId, "message:seen", {
      lastMessageId: lastMessage.id,
      seenMessage: updatedMessage.seenMessage,
      status: updatedMessage.status,
    });

    return NextResponse.json(
      {
        status: updatedMessage.status,
        lastMessageId: lastMessage.id,
        seenMessage: updatedMessage.seenMessage,
      } as SeenResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in seen route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
