"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Phone, PhoneOffIcon, X } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IncomingCallBannerProps {
  otherUser: User | undefined;
  onAccept: () => void;
  onReject: () => void;
  callType?: "AUDIO" | "VIDEO";
  endCallLoading: boolean;
  audioCallLoading: boolean;
  videoCallLoading: boolean;
}

const CALL_TIMEOUT = 60000;

export const IncomingCallBanner: React.FC<IncomingCallBannerProps> = ({
  endCallLoading,
  audioCallLoading,
  videoCallLoading,
  otherUser,
  onAccept,
  onReject,
  callType = "VIDEO",
}) => {
  const [hideCall, setHideCall] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Auto reject call after 60 sec
    const timeout = setTimeout(() => {
      onReject();
      setHideCall(true);
    }, CALL_TIMEOUT);

    // Update progress every second
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        return next > 60 ? 60 : next;
      });
    }, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [onReject]);

  return (
    <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-50 w-[22rem] animate-fadeIn ${hideCall && "hidden"}`}>
      <Card className="relative shadow-xl bg-background transition-all duration-1000">
        {/* Callee information */}
        <CardHeader className="flex flex-row items-center gap-4">
          <div className=" rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
            <Image src={otherUser?.image || "/images/avatar.jpg"} alt={otherUser?.name || "User"} height={50} width={50} className="object-cover rounded-full" priority />
          </div>
          <div>
            <p className="text-lg font-semibold">{otherUser?.name}</p>
            <p className="text-sm text-muted-foreground">Incoming {callType.toLowerCase()} call</p>
          </div>
        </CardHeader>

        {/* Accept and reject buttons */}
        <CardContent>
          <div className="flex justify-between">
            <Button onClick={onAccept} className="w-[48%] hover:cursor-pointer" variant="outline" size="sm">
              {audioCallLoading || videoCallLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <Phone /> <span className="ml-2">Accept</span>
                </>
              )}
            </Button>
            <Button onClick={onReject} className="w-[48%] hover:cursor-pointer dark:hover:bg-red-600 bg-red-500" variant="destructive" size="sm">
              {endCallLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <PhoneOffIcon /> <span className="ml-2">Decline</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>

        <div className="transition-all absolute top-2 right-2 hover:cursor-pointer" onClick={() => setHideCall(true)}>
          <X size={20} />
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 h-0.5 bg-red-400 transition-all duration-1000 ml-2 rounded-lg" style={{ width: `${(progress / 60) * 97}%` }} />
      </Card>
    </div>
  );
};
