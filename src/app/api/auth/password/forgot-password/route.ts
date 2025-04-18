import { NextRequest, NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  /* Verify user exists in db using email id */
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return NextResponse.json({ message: "User does not exists" }, { status: 400 });

  /* Create a temp token and hash the tokne using crypto */
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  /* Update the token info in the db */
  await prisma.user.update({
    where: { email },
    data: { resetToken: hashedToken, resetTokenExp: tokenExpiry },
  });

  // const resetLink

  return NextResponse.json({ success: true });
}
