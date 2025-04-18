"use client";

import { usePresenceContext } from "@/contexts/PresenceContext";
import { getPusherClient } from "@/libs/pusher/pusherClient";
import { useCallback, useEffect, useRef } from "react";
import axios from "axios";

const PresenceManager = ({ currentUser }: { currentUser: User }) => {
  const { setPresence } = usePresenceContext();
  const pusherClient = getPusherClient();
  const heartBeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTabHidden = useRef<boolean>(false);

  /* Method to send heartbeat to api route */
  const sendHeartbeat = useCallback(async () => {
    try {
      axios.post("/api/users/heartbeat", { userId: currentUser.id });
    } catch (error) {
      console.log("sendHeartbeat error: ", error);
    }
  }, [currentUser]);

  /* Set up heartbeat on mount */
  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabHidden.current = true;
        if (heartBeatIntervalRef.current) clearInterval(heartBeatIntervalRef.current);
      } else {
        isTabHidden.current = false;
        sendHeartbeat(); // send heartbeat immediatly when tab is in focus again
        heartBeatIntervalRef.current = setInterval(sendHeartbeat, 60000);
      }
    };

    // Add event listener to handle visibility change so if tab changes it will not send heartbeat
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start heartbeat when the component mounts
    sendHeartbeat();
    heartBeatIntervalRef.current = setInterval(sendHeartbeat, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (heartBeatIntervalRef.current) {
        clearInterval(heartBeatIntervalRef.current);
      }
    };
  }, [currentUser, sendHeartbeat]);

  /* Subscribe to pusher events */
  useEffect(() => {
    const friendsOnlineChannel = pusherClient.subscribe("online-presence");

    friendsOnlineChannel.bind("friend-online", (data: { userId: string; isOnline: boolean }) => {
      setPresence(data.userId, data.isOnline);
    });

    return () => {
      friendsOnlineChannel.unbind_all();
      friendsOnlineChannel.unsubscribe();
    };
  }, [pusherClient, setPresence]);

  return null;
};

export default PresenceManager;
