import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/libs/prismadb";
import { checkRateLimit } from "@/libs/auth/checkRateLimit";
import generateUniqueUsername from "@/libs/auth/generateUniqueUsername";
import * as z from "zod";

const registerSchema = z.object({
  name: z.string({ required_error: "Name is required" }).trim(),
  email: z.string({ required_error: "Email is required" }).email("Invalid email format").trim().toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .trim()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // const { name, email, password } = body;

    // if (!email || !password) {
    //   return NextResponse.json({ message: "Missing credentials" }, { status: 400 });
    // }

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: validation.error.flatten() }, { status: 400 });
    }

    /* Rate limiter for signup */
    const signupAllowed = checkRateLimit({
      key: validation.data?.email ?? "",
      type: "signup",
      limit: 3,
      windowMs: 10 * 1000,
    });

    if (!signupAllowed) {
      throw new Error("Too many signup attempts");
    }

    /* Check if the user already exists, show message if exists */
    const existingUser = await prisma.user.findUnique({ where: { email: validation.data?.email } });
    if (existingUser) {
      return NextResponse.json({ message: "User email exists, try Login" }, { status: 400 });
    }

    /* If user does not exists, hash the passowrd and create new user with unique username */
    const hashedPassword = await bcrypt.hash(validation.data.password, 10);
    const uniqueUsername = await generateUniqueUsername(validation.data.name);

    const user = await prisma.user.create({
      data: {
        name: validation.data.name || "User",
        email: validation.data.email,
        hashedPassword,
        username: uniqueUsername,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
