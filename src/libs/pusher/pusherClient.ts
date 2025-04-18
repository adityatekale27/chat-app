"use client";

import PusherClient from "pusher-js";

let _client: PusherClient | null = null;

export function getPusherClient() {
  const key = process.env.PUSHER_KEY ?? "93f739f3c13f5a3a891a";
  const cluster = process.env.PUSHER_CLUSTER ?? "ap2";

  if (!key || !cluster) {
    throw new Error("Pusher key or cluster is not defined in environment variables");
  }

  if (!_client) {
    PusherClient.logToConsole = true;
    _client = new PusherClient(key, { cluster, forceTLS: true });
  }

  return _client!;
}
