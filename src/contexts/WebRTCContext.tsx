"use client"

import { useWebRTC } from "@/hooks/useWebRTC";
import { createContext, useContext } from "react";

const WebRTCContext = createContext<ReturnType<typeof useWebRTC> | null>(null);

export const WebRTCProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useWebRTC();
  return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
};

export const useWebRTCContext = () => {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error("useWebRTCContext must be used within WebRTCProvider");
  return ctx;
};
