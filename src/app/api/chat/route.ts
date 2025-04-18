import getCurrentUser from "@/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";
import { NextRequest, NextResponse } from "next/server";

type UserSafe = Pick<User, "id" | "name" | "email" | "image" | "isOnline" | "lastOnline" | "username" | "bio">;

type MessageWithSenderAndSeen = Message & {
  sender: UserSafe;
  seenMessage: UserSafe[];
};

type ConversationWithRelations = Conversation & {
  users: UserSafe[];
  groupAdmins: UserSafe[];
  groupCreator: UserSafe | null;
  messages: MessageWithSenderAndSeen[];
};

type PusherConversationPayload =
  | ConversationWithRelations
  | {
      updatedConversation: Partial<ConversationWithRelations>;
      action: "admin_left" | "member_left";
      userId: string;
    }
  | {
      updatedGroup: Partial<ConversationWithRelations>;
      action: "group_update";
    }
  | {
      id: string; // for "conversation:removed"
    };

type UserInclude = {
  id: true;
  name: true;
  email: true;
  image: true;
  isOnline: true;
  lastOnline: true;
  username: true;
  bio: true;
};

type GroupBody = {
  members: string[];
  name: string;
  groupBio?: string;
  groupAvatar?: string;
  isGroup: boolean;
};

const userInclude = {
  select: {
    id: true,
    name: true,
    email: true,
    image: true,
    isOnline: true,
    lastOnline: true,
    username: true,
    bio: true,
  } satisfies UserInclude,
};

const conversationInclude = {
  users: userInclude,
  groupAdmins: userInclude,
  groupCreator: userInclude,
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      sender: userInclude,
      seenMessage: userInclude,
    },
  },
};

/* Helper function for triggering pusher events */
async function triggerPusherEvents(userIds: string[], event: string, data: PusherConversationPayload) {
  try {
    await Promise.all(userIds.map((userId) => pusherServer.trigger(userId, event, data)));
  } catch (error) {
    console.error("Pusher trigger failed:", error);
    throw new Error("Real-time update failed");
  }
}

/*
  POST method to create new group or one to one conversation.
*/
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, isGroup } = body;

    if (isGroup) {
      return handleGroupCreation(currentUser, body);
    }

    return handleIndividualConversation(currentUser, userId);
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }

  /* 
    Handler for group conversation creation 
  */
  async function handleGroupCreation(currentUser: User, body: GroupBody) {
    const { members, name } = body;
    const MIN_GROUP_MEMBERS = 2;

    // Check the values are not empty and are valid
    if (!members || members.length < MIN_GROUP_MEMBERS || !name) {
      return NextResponse.json({ message: "Invalid group data" }, { status: 400 });
    }

    // Combine members with the current user ID and remove any duplicates
    const uniqueMembers = [...new Set([...members, currentUser.id])];

    // Check all the members are valid users
    const validUsers = await prisma.user.findMany({
      where: { id: { in: uniqueMembers } },
    });

    if (validUsers.length !== uniqueMembers.length) {
      return NextResponse.json({ message: "Invalid members" }, { status: 400 });
    }

    try {
      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: true,
          name: body.name,
          groupBio: body.groupBio,
          groupAvatar: body.groupAvatar,
          userIds: uniqueMembers,
          groupAdminIds: [currentUser.id],
          groupCreatorId: currentUser.id,
          users: { connect: uniqueMembers.map((id) => ({ id })) },
        },
        include: conversationInclude,
      });

      // Trigger pusher event for group conversation
      await triggerPusherEvents([...newConversation.userIds], "conversation:new", newConversation);

      return NextResponse.json(newConversation, { status: 201 });
    } catch (error) {
      console.error("Group creation failed:", error);
      return NextResponse.json({ message: "Group creation failed" }, { status: 500 });
    }
  }

  /* 
    Handler for individual conversation creation 
  */
  async function handleIndividualConversation(currentUser: User, userId?: string) {
    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    // Check userId and currentuser are not the same person
    if (userId === currentUser.id) {
      return NextResponse.json({ message: "Cannot create conversation with yourself" }, { status: 400 });
    }

    // Find if the conversation exists in the db
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userIds: { hasEvery: [currentUser.id, userId] },
        isGroup: false,
      },
    });

    if (existingConversation) {
      return NextResponse.json(existingConversation);
    }

    try {
      const newConversation = await prisma.conversation.create({
        data: {
          userIds: [currentUser.id, userId],
          users: { connect: [{ id: currentUser.id }, { id: userId }] },
        },
        include: conversationInclude,
      });

      // Trigger conversation:new pusher event for individual conversation
      await triggerPusherEvents([...newConversation.userIds], "conversation:new", newConversation);

      return NextResponse.json(newConversation, { status: 201 });
    } catch (error) {
      console.error("Individual conversation creation failed:", error);
      return NextResponse.json({ message: "Conversation creation failed" }, { status: 500 });
    }
  }
}

/*
  GET method for fetching all the conversations that the current user is part of,
  show specific conversation if searchQuery is available
*/
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("search")?.trim();

    const conversations = await prisma.conversation.findMany({
      where: {
        userIds: { has: currentUser.id },
        ...(searchQuery && {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            {
              users: {
                some: {
                  name: { contains: searchQuery, mode: "insensitive" },
                  id: { not: currentUser.id },
                },
              },
            },
          ],
        }),
      },
      include: conversationInclude,
      orderBy: { lastMessageAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("GET /api/chat error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
