import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { token, password, email } = await request.json();
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  /* Check and find the user using token */
  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExp: { gte: new Date() },
    },
  });

  if (!user) return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });

  /* hash the new password using bcrypt */
  const hashedPassword = await bcrypt.hash(password, 10);

  /* update user with new password */
  await prisma.user.update({
    where: { email },
    data: {
      hashedPassword: hashedPassword,
      resetToken: null,
      resetTokenExp: null,
    },
  });

  return NextResponse.json({ message: "Password updated!" }, { status: 200 });
}
