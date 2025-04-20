import { pusherServer } from "@/libs/pusher/pusherServer";
import getSession from "@/actions/getSession";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Parse x-www-form-urlencoded manually
  const formData = await request.text();
  const params = new URLSearchParams(formData);
  const socket_id = params.get("socket_id");
  const channel_name = params.get("channel_name");

  if (!socket_id || !channel_name) {
    return NextResponse.json({ message: "Missing data" }, { status: 400 });
  }

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("pusherAuthentication error", error);
    return NextResponse.json({ message: "Authentication failed" }, { status: 500 });
  }
}
