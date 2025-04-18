import { NextResponse } from "next/server";
import getCurrentUser from "@/actions/getCurrentUser";
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

const messageInclude = {
  sender: { select: userSelect },
  seenMessage: { select: userSelect },
} as const;

const conversationInclude = {
  users: { select: userSelect },
  messages: {
    orderBy: { createdAt: "desc" as const },
    include: messageInclude,
  },
};

/*
  GET method return all the messsages in perticular conversation
*/
export async function GET(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json({ message: "Conversation ID is required" }, { status: 400 });
    }

    // Verify current user is part of conversation
    const conversationPart = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userIds: true },
    });

    if (!conversationPart?.userIds.includes(currentUser.id)) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /message/[conversationId] error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/*
  DELETE method to permanently remove a message by using messageId
  from the conversation that current user is part of.
*/
export async function DELETE(request: Request, context: { params: { conversationId: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await context.params;
    if (!conversationId) {
      return NextResponse.json({ message: "Conversation ID is required" }, { status: 400 });
    }

    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ message: "Message ID is required" }, { status: 400 });
    }

    // Verfiy message exits in conversation
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId: conversationId,
      },
      include: { conversation: true },
    });

    if (!message) {
      return NextResponse.json({ message: "Message not found" }, { status: 404 });
    }

    // Check if the user is part of conversation
    if (!message.conversation.userIds.includes(currentUser.id)) {
      return NextResponse.json({ message: "You don't have permission to delete this message" }, { status: 403 });
    }

    // Check the message is send by current user
    if (message.senderId !== currentUser.id) {
      return NextResponse.json({ message: "You can only delete your own messages" }, { status: 403 });
    }

    // Delete the message
    await prisma.message.delete({ where: { id: messageId } });

    // Find the new latest message in the conversation
    const latestMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
    });

    // Update conversation with the actual last message info
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        lastMessageAt: latestMessage?.createdAt || null,
        messagesIds: { set: message.conversation.messagesIds.filter((id) => id !== messageId) },
      },
      select: conversationInclude,
    });

    // Pusher event for delte message
    await pusherServer.trigger(conversationId, "message:deleted", messageId);

    // Notify each user of updated last message
    await Promise.all(
      updatedConversation.users.map((user) =>
        pusherServer.trigger(user.id!, "conversation:lastMessage", {
          id: conversationId,
          message: latestMessage ? [latestMessage] : [],
          lastMessageAt: latestMessage?.createdAt || null,
        })
      )
    );

    return NextResponse.json(messageId, { status: 200 });
  } catch (error) {
    console.error("DELETE /message/[conversationId] error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
