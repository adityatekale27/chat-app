import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/actions/getCurrentUser";
import { pusherServer } from "@/libs/pusher/pusherServer";

type GroupUpdatePayload = {
  updatedGroup: Pick<Conversation, "id" | "name" | "userIds" | "groupAdminIds">;
  action: "group_update";
};

type MemberLeftPayload = {
  updatedConversation: Pick<Conversation, "id" | "userIds" | "groupAdminIds">;
  action: "admin_left" | "member_left";
  userId: string;
};

type PusherEventPayload = GroupUpdatePayload | MemberLeftPayload | { id: string };
import * as z from "zod";

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  isOnline: true,
  lastOnline: true,
} as const;

const messageInclude = {
  sender: { select: userSelect },
  seenMessage: { select: userSelect },
} as const;

const conversationInclude = {
  users: { select: userSelect },
  groupAdmins: { select: userSelect },
  groupCreator: { select: userSelect },
  messages: {
    take: 1,
    orderBy: { createdAt: "desc" as const },
    include: messageInclude,
  },
} as const;

/* Helper function for triggering pusher events */
async function triggerPusherEvents(userIds: string[], event: string, data: PusherEventPayload) {
  try {
    await Promise.all(userIds.map((userId) => pusherServer.trigger(userId, event, data)));
  } catch (error) {
    console.error("Pusher trigger failed:", error);
    throw new Error("Real-time update failed");
  }
}

// Schema for group editing
const groupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").max(50),
  groupBio: z.string().max(500, "Group bio cannot exceed 500 characters").optional(),
  groupAdmins: z.array(z.string()).optional(),
  users: z.array(z.string()).min(2, "Select at least two members"),
  groupAvatar: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z
      .string()
      .url("Invalid image URL")
      .refine((url) => url.startsWith("https://"), "Must be a secure HTTPS URL")
      .optional()
  ),
});

/*
  GET method fetches a conversation if the user is participant
*/
export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json({ message: "Conversation ID required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

    if (!conversation || !conversation.userIds.includes(currentUser.id)) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("GET /api/chat/[conversationId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/*
  PATCH method for updating group conversation
*/
export async function PATCH(request: NextRequest) {
  try {
    const { formData, conversationId } = await request.json();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if the group exists or not
    const existingGroup = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        users: true,
        groupAdmins: true,
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!existingGroup.isGroup) {
      return NextResponse.json({ error: "Only group chats can be updated" }, { status: 400 });
    }

    // Check if current user is a group admin
    const isAdmin = existingGroup.groupAdmins.some((admin) => admin.id === currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Only group admins can update group details" }, { status: 403 });
    }

    // Validate form data
    const validation = groupSchema.safeParse(formData);
    if (!validation.success) {
      return NextResponse.json({ message: validation.error.flatten() }, { status: 400 });
    }

    // Check that at least one group admin remains after the update
    const updatedAdmins = validation.data.groupAdmins || [];
    if (updatedAdmins.length === 0) {
      return NextResponse.json({ message: "At least one group admin is required" }, { status: 400 });
    }

    // Check that all users in groupAdmins are also in users array
    const updatedUsers = validation.data.users;
    const invalidAdmins = updatedAdmins.filter((adminId) => !updatedUsers.includes(adminId));
    if (invalidAdmins.length > 0) {
      return NextResponse.json({ message: "All admins must also be members of the group" }, { status: 400 });
    }

    // Update group details
    const updatedGroup = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: validation.data.name,
        groupBio: validation.data.groupBio,
        groupAvatar: validation.data.groupAvatar,
        users: { set: validation.data.users.map((userId) => ({ id: userId })) },
        groupAdmins: { set: updatedAdmins.map((adminId) => ({ id: adminId })) },
      },
      include: {
        users: { select: userSelect },
        groupAdmins: { select: userSelect },
      },
    });

    // Trigger pusher event for real-time updates to all group members
    await Promise.all(updatedGroup.users.map((user) => pusherServer.trigger(user.id, "conversation:updated", { updatedGroup, action: "group_update" })));

    return NextResponse.json(updatedGroup, { status: 200 });
  } catch (error) {
    console.error("PATCH group update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/*
  DELETE method - /api/chat/[conversationId]?action=leave|delete
  For one-to-one: deletes the conversation for both users.
  For groups:
    - action=delete (admins only): deletes the group for everyone.
    - action=leave: removes the current user (and admin if applicable).
*/
type DeleteAction = "delete" | "leave";

export async function DELETE(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json({ message: "Conversation ID required" }, { status: 400 });
    }

    // Get the action from the params (delete or leave)
    const actionParam = (new URL(request.url).searchParams.get("action") || "leave") as DeleteAction;

    // Get the conversation info
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        isGroup: true,
        userIds: true,
        groupAdminIds: true,
      },
    });

    // Validate the conversaiton and current user
    if (!conversation) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    if (!conversation.userIds.includes(currentUser.id)) return NextResponse.json({ message: "Not a participant" }, { status: 403 });

    // Get all participants from the conversation
    const participants = await prisma.user.findMany({
      where: { id: { in: conversation.userIds } },
      select: { id: true, conversationIds: true },
    });

    // Update user payload (remove the conversation from their conversationIds)
    const userUpdate = participants.map((user) => ({
      where: { id: user.id },
      data: { conversationIds: { set: user.conversationIds.filter((conId) => conId !== conversationId) } },
    }));

    /* 
      For one to one conversation 
    */
    if (!conversation.isGroup) {
      await prisma.$transaction([
        prisma.call.deleteMany({ where: { conversationId } }),
        prisma.message.deleteMany({ where: { conversationId } }),
        prisma.conversation.delete({ where: { id: conversationId } }),
        ...userUpdate.map((u) => prisma.user.update(u)),
      ]);

      await triggerPusherEvents(conversation.userIds, "conversation:removed", { id: conversationId });
      return NextResponse.json({ success: true });
    }

    /*
      For group conversation,
      first Check for admin and action params
    */
    const isAdmin = conversation.groupAdminIds.includes(currentUser.id);
    if (!["leave", "delete"].includes(actionParam)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    // Delete the group conversation if action is "delete" and current user is admin
    if (actionParam === "delete") {
      if (!isAdmin) return NextResponse.json({ message: "Only admins can delete" }, { status: 403 });

      await prisma.$transaction([
        prisma.call.deleteMany({ where: { conversationId } }),
        prisma.message.deleteMany({ where: { conversationId } }),
        prisma.conversation.delete({ where: { id: conversationId } }),
        ...userUpdate.map((u) => prisma.user.update(u)),
      ]);

      await triggerPusherEvents(conversation.userIds, "conversation:removed", { id: conversationId });
      return NextResponse.json({ success: true });
    }

    // Admin leaves (but not deleting)
    if (actionParam === "leave" && isAdmin) {
      if (conversation.groupAdminIds.length < 2) {
        return NextResponse.json({ message: "Appoint another admin before leaving" }, { status: 400 });
      }

      if (conversation.userIds.length === 1 && actionParam === "leave") {
        return NextResponse.json({ message: "You cannot leave the group as the last member. Please delete it instead." }, { status: 400 });
      }

      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          userIds: { set: conversation.userIds.filter((id) => id !== currentUser.id) },
          groupAdminIds: { set: conversation.groupAdminIds.filter((id) => id !== currentUser.id) },
        },
      });

      if (userUpdate.find((u) => u.where.id === currentUser.id)) {
        await prisma.user.update(userUpdate.find((u) => u.where.id === currentUser.id)!);
      }

      await triggerPusherEvents(conversation.userIds, "conversation:updated", {
        updatedConversation,
        action: "admin_left",
        userId: currentUser.id,
      });

      return NextResponse.json({ success: true });
    }

    // Normal member leaves
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        userIds: { set: conversation.userIds.filter((id) => id !== currentUser.id) },
      },
    });

    if (userUpdate.find((u) => u.where.id === currentUser.id)) {
      await prisma.user.update(userUpdate.find((u) => u.where.id === currentUser.id)!);
    }

    await triggerPusherEvents(conversation.userIds, "conversation:updated", {
      updatedConversation,
      action: "member_left",
      userId: currentUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /chat/[conversationId] error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
