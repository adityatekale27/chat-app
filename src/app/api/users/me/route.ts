import getCurrentUser from "@/actions/getCurrentUser";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { pusherServer } from "@/libs/pusher/pusherServer";

const userSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  image: true,
  email: true,
  isOnline: true,
  lastOnline: true,
};

interface UpdateData {
  name: string;
  username?: string;
  bio?: string;
  hashedPassword?: string;
  image?: string | null;
}

/* Zod shcema for user update */
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores allowed")
    .optional(),
  image: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z
      .string()
      .url("Invalid image URL")
      .refine((url) => url.startsWith("https://"), "Must be a secure HTTPS URL")
      .optional()
  ),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === "" || val.length >= 8, {
      message: "New Password must be at least 8 characters",
    })
    .refine((val) => val === undefined || val === "" || /[A-Z]/.test(val), {
      message: "New Password must contain at least one uppercase letter",
    })
    .refine((val) => val === undefined || val === "" || /[0-9]/.test(val), {
      message: "New Password must contain at least one number",
    }),
});

export async function PATCH(request: NextRequest) {
  try {
    const { userId, formData } = await request.json();
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    /* Validate the formData using zod */
    const validation = profileSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.flatten();
      const firstFieldError = Object.values(errors.fieldErrors)[0]?.[0];
      const formError = errors.formErrors?.[0];

      return NextResponse.json({ message: firstFieldError || formError || "Invalid input" }, { status: 400 });
    }

    /* Check username already exists or not */
    if (validation.data.username && validation.data.username !== currentUser.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: validation.data.username?.trim() },
      });

      if (existingUser && existingUser.id !== currentUser.id) {
        return NextResponse.json({ message: "This username is already taken" }, { status: 400 });
      }
    }

    /* Base update data */
    const updateData: UpdateData = {
      name: validation.data.name,
      username: validation.data.username?.trim(),
      bio: validation.data.bio,
      image: validation.data.image,
    };

    /* Handle current password or new password change */
    if (validation.data.newPassword && validation.data.newPassword.trim() !== "") {
      // user has an existing password and wants to change it
      if (validation.data.currentPassword && currentUser.hashedPassword) {
        const isPasswordValid = await bcrypt.compare(validation.data.currentPassword, currentUser.hashedPassword);
        if (!isPasswordValid) {
          return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
        }

        updateData.hashedPassword = await bcrypt.hash(validation.data.newPassword, 10);
      }
      // user doesn't have a password yet and wants to set one
      else if (!currentUser.hashedPassword) {
        updateData.hashedPassword = await bcrypt.hash(validation.data.newPassword, 10);
      }
      // user has a password but didn't provide current password
      else {
        return NextResponse.json({ message: "Current password is required to set a new password" }, { status: 400 });
      }
    }

    /* Update the user in database */
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: userSelect,
    });

    /* Trigger pusher event for user update */
    await pusherServer.trigger("userUpdate", "user:updated", updatedUser);

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("PATCH profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ message: "User id is required" }, { status: 401 });
    }

    if (userId !== currentUser?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    /* Check if the user exists */
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "User does not exists" }, { status: 400 });
    }

    // Fetch all friend to trigger pusher event
    const friends = await prisma.contact.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: { sender: true, receiver: true },
    });
    const allFriendsIds = new Set<string>();
    friends.forEach((f) => {
      if (f.senderId !== userId) allFriendsIds.add(f.senderId);
      if (f.receiverId !== userId) allFriendsIds.add(f.receiverId);
    });

    /* Transaction to delete all user related data */
    await prisma.$transaction([
      // delete all user messages
      prisma.message.deleteMany({
        where: { senderId: userId },
      }),

      // delete all user calls
      prisma.call.deleteMany({
        where: {
          OR: [
            { calleeId: userId },
            { callerId: userId },
            {
              conversation: {
                userIds: { has: userId },
              },
            },
          ],
        },
      }),

      // remove user from all conversations
      prisma.conversation.updateMany({
        where: { userIds: { has: userId } },
        data: { userIds: { set: [] } },
      }),

      // delete friend requests and from others friend list
      prisma.contact.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      }),

      // delete oauth accounts
      prisma.account.deleteMany({
        where: { userId },
      }),

      // delete the user
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);

    const response = NextResponse.json({ message: "Account permanently deleted" }, { status: 200 });

    // remove auth cookies
    const cookieNames = ["next-auth.session-token", "__Secure-next-auth.session-token", "next-auth.csrf-token", "__Host-next-auth.csrf-token"];
    cookieNames.forEach((name) => {
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    });

    response.headers.set("x-auth-redirect", "/");

    // Trigger pusher event for user delete
    await Promise.all(
      Array.from(allFriendsIds).map((id) => {
        pusherServer.trigger(`user:${id}`, "user:deleted", { userId });
      })
    );

    return response;
  } catch (error) {
    console.error("DELETE /api/users/me", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
