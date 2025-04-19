"use client";

import PusherClient from "pusher-js";

let _client: PusherClient | null = null;

export function getPusherClient() {
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    throw new Error("Missing Pusher credentials.");
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!_client) {
    if (process.env.NODE_ENV === "development") {
      PusherClient.logToConsole = true;
    }

    _client = new PusherClient(key, { cluster, forceTLS: true });
  }

  return _client!;
}
