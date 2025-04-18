"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface PresenceContextProps {
  onlineUsers: { [userId: string]: boolean };
  setPresence: (userId: string, isOnline: boolean) => void;
}

/* Create the context with default value */
const PresenceContext = createContext<PresenceContextProps>({ onlineUsers: {}, setPresence: () => {} });

/* Provider component, wrap all chat layout and holds states (online users) */
export const PresenceProvider = ({ children }: { children: ReactNode }) => {
  const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: boolean }>({});

  // method to update online status
  const setPresence = (userId: string, isOnline: boolean) => {
    setOnlineUsers((prev) => {
      if (!isOnline) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [userId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [userId]: isOnline };
    });
  };

  // Provider from presence context it makes state and updater function available to children
  return <PresenceContext.Provider value={{ onlineUsers, setPresence }}>{children}</PresenceContext.Provider>;
};

/* Hook to access the presence context */
export const usePresenceContext = () => useContext(PresenceContext);
