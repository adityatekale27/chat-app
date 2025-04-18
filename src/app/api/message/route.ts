import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import getCurrentUser from "@/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type MessageBody = {
  message?: string;
  image?: string;
  conversationId: string;
};

const userInclude = {
  id: true,
  name: true,
  email: true,
  image: true,
  isOnline: true,
  lastOnline: true,
  username: true,
  bio: true,
};

const messageInclude = {
  sender: { select: userInclude },
  seenMessage: { select: userInclude },
};

const conversationInclude = {
  users: { select: userInclude },
  messages: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    include: messageInclude,
  },
};

/* 
  POST method to create a new message in conversation 
*/
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as MessageBody;
    const { message, image, conversationId } = body;

    if ((!message && !image) || !conversationId) {
      return NextResponse.json({ message: "Message (text or image) and conversation ID are required" }, { status: 400 });
    }

    return await handlePost({ currentUserId: currentUser.id, conversationId, message, image });
  } catch (error) {
    console.error("POST /api/message error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/* Handler for creating a message and updating the conversation */
async function handlePost({ currentUserId, conversationId, message, image }: { currentUserId: string; conversationId: string; message?: string; image?: string }) {
  try {
    // Create a new message
    const newMessage = await prisma.message.create({
      data: {
        text: message,
        imageUrl: image,
        senderId: currentUserId,
        conversationId,
        seenMessageIds: [currentUserId],
        status: "SENT",
      },
      include: messageInclude,
    });

    // Update the conversation with lastMessageAt, updatedAt and messageIds
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        messagesIds: { push: newMessage.id },
      },
      include: conversationInclude,
    });

    // Trigger pusher event
    await pusherServer.trigger(conversationId, "message:new", newMessage);

    // Push last message update to all users
    await Promise.all(
      updatedConversation.users.map((user) =>
        pusherServer.trigger(user.id!, "conversation:lastMessage", {
          id: conversationId,
          message: [updatedConversation.messages[0]],
          lastMessageAt: new Date(),
        })
      )
    );

    return NextResponse.json(newMessage);
  } catch (err) {
    console.error("Message creation failed:", err);
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}
