import { NextRequest, NextResponse } from "next/server";
import getCurrentUser from "@/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { pusherServer } from "@/libs/pusher/pusherServer";
import { checkRateLimit } from "@/libs/auth/checkRateLimit";
import { Contact } from "@prisma/client";

type UserSafe = Pick<User, "id" | "name" | "email" | "username" | "bio" | "image" | "isOnline" | "lastOnline">;

type ContactWithUsers = Contact & {
  sender: UserSafe;
  receiver: UserSafe;
};

const FriendSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  bio: true,
  image: true,
  isOnline: true,
  lastOnline: true,
};

/* Helper function to trigger pusher events */
async function triggerPusherEvents(userIds: string[], event: string, data: ContactWithUsers) {
  try {
    await Promise.all(userIds.map((userId) => pusherServer.trigger(userId, event, data)));
  } catch (error) {
    console.error("Pusher /api/contact error", error);
    throw new Error("Real-time update failed");
  }
}

/**
 * POST method to create, delete or accept friend request
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, deleteRequest, acceptRequest, senderId: requestSenderId } = body;

    const senderId = acceptRequest ? requestSenderId : currentUser?.id;
    const receiverIdForAccept = acceptRequest ? currentUser?.id : receiverId;

    if (!senderId || !receiverIdForAccept) {
      return NextResponse.json({ message: "Invalid Request Data" }, { status: 400 });
    }

    if (senderId === receiverIdForAccept) {
      return NextResponse.json({ message: "You cannot send a request to yourself" }, { status: 400 });
    }

    /*
      DELETE a request, if not friends or unfriend a user if frineds
    */
    if (deleteRequest) {
      const existingRequest = await prisma.contact.findFirst({
        where: {
          OR: [
            { senderId, receiverId: receiverIdForAccept },
            { senderId: receiverIdForAccept, receiverId: senderId },
          ],
          status: {
            in: ["ACCEPTED", "PENDING"],
          },
        },
        include: {
          sender: true,
          receiver: true,
        },
      });

      if (!existingRequest) {
        return NextResponse.json({ message: "No pending or accepted request found" }, { status: 400 });
      }

      // Delete the friend request
      await prisma.contact.delete({
        where: { id: existingRequest.id },
      });

      // Determine the event name and trigger the pusher event
      const eventName = existingRequest.status === "PENDING" ? "friend:request:canceled" : "friend:removed";
      await triggerPusherEvents([senderId, receiverIdForAccept], eventName, existingRequest);

      return NextResponse.json({ message: existingRequest.status === "PENDING" ? "Friend request canceled" : "Friend removed" }, { status: 200 });
    }

    /*
      ACCEPT the friend request
    */
    if (acceptRequest) {
      const existingRequest = await prisma.contact.findFirst({
        where: {
          senderId,
          receiverId: receiverIdForAccept,
          status: "PENDING",
        },
      });

      if (!existingRequest) {
        return NextResponse.json({ message: "Friend request does not found" }, { status: 400 });
      }

      // Update the users reqeust and make a contact relation
      const updatedRequest = await prisma.contact.update({
        where: { id: existingRequest.id },
        data: { status: "ACCEPTED" },
        include: {
          sender: true,
          receiver: true,
        },
      });

      // Trigger the pusher event
      await triggerPusherEvents([senderId, receiverIdForAccept], "friend:request:accepted", updatedRequest);

      return NextResponse.json({ message: "Friend request Accepted" }, { status: 200 });
    }

    /*
      CREATE new frined request: 
      first check for rate limiting
    */
    const sendingRequestAllowed = checkRateLimit({
      type: "request",
      key: currentUser.id,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!sendingRequestAllowed) {
      return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    }

    const existingRequest = await prisma.contact.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiverIdForAccept },
          { senderId: receiverIdForAccept, receiverId: senderId },
        ],
        status: {
          in: ["ACCEPTED", "PENDING"],
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json({ message: existingRequest.status === "ACCEPTED" ? "Friend request already accepted" : "Friend request already sent" }, { status: 400 });
    }

    // Create new friend request
    const friendRequest = await prisma.contact.create({
      data: {
        senderId,
        receiverId: receiverIdForAccept,
        status: "PENDING",
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Trigger pusher event
    await triggerPusherEvents([receiverIdForAccept], "friend:request:new", friendRequest);

    return NextResponse.json(friendRequest, { status: 201 });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json({ message: "Friend request failed to send" }, { status: 500 });
  }
}

/**
 * GET method for fetching friends, sent requests, received requests
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract pagination pointer and search query from the url
    const { searchParams } = new URL(request.url);
    const lastFriendId = searchParams.get("lastFriendId");
    const searchQuery = searchParams.get("search");
    const userId = currentUser?.id;

    const otherUserId = searchParams.get("otherUserId"); // for showing otherusers friend list

    // Fetch all the users with status accepted
    const friends = await prisma.contact.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, status: "ACCEPTED" },
              { receiverId: userId, status: "ACCEPTED" },
            ],
          },
          searchQuery
            ? {
                OR: [{ sender: { name: { contains: searchQuery, mode: "insensitive" } } }, { receiver: { name: { contains: searchQuery, mode: "insensitive" } } }],
              }
            : {},
        ],
      },
      include: {
        sender: { select: FriendSelect },
        receiver: { select: FriendSelect },
      },
      take: 50,
      orderBy: { id: "asc" },
      // if lastFriendId present then skip that record
      ...(lastFriendId ? { skip: 1, cursor: { id: lastFriendId } } : {}),
    });

    // If fetched 50 users, assign new pagination pointer (lastFrinedId)
    const newLastFriendId = friends.length === 50 ? friends[49].id : null;

    // Fetch otherUsers friend list
    const otherUserFriends = otherUserId
      ? await prisma.contact.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ senderId: otherUserId }, { receiverId: otherUserId }],
          },
          include: {
            sender: { select: FriendSelect },
            receiver: { select: FriendSelect },
          },
          orderBy: { id: "asc" },
        })
      : [];

    // Get all sent friend request
    const sentRequest = await prisma.contact.findMany({
      where: {
        senderId: userId,
        status: "PENDING",
      },
      include: {
        receiver: true,
      },
    });

    // Get all received friend request
    const receivedRequest = await prisma.contact.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: {
        sender: true,
      },
    });

    // Get all blocked users
    const blockedUsers = await prisma.contact.findMany({
      where: {
        OR: [
          { senderId: userId, status: "BLOCKED" },
          { receiverId: userId, status: "BLOCKED" },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    return NextResponse.json({ friends, lastFriendId: newLastFriendId, sentRequest, receivedRequest, blockedUsers, otherUserFriends }, { status: 200 });
  } catch (error) {
    console.error("GET /api/contact error", error);
    return NextResponse.json({ message: "Failed to fetch Friends!" }, { status: 500 });
  }
}
