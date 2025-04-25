"use client";

import { format, isToday, isYesterday, isThisYear } from "date-fns";
import toast from "react-hot-toast";
import { UserBoxSkeleton } from "../loading-states/LoadingSkeleton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import useChat from "@/hooks/useChat";
import { Loader2, Phone, PhoneIncoming, PhoneOutgoing, Video } from "lucide-react";
import { useWebRTCContext } from "@/contexts/WebRTCContext";

interface CallsSidebarProps {
  searchTerm?: string;
  currentUser: {
    id: string;
    name?: string | null;
    image?: string | null;
    isOnline?: boolean;
  } | null;
}

export function formatCallTime(date: Date): string {
  if (!date) return "Unknown time";

  const parsedDate = new Date(date);

  if (isToday(parsedDate)) {
    return `today, ${format(parsedDate, "hh:mm a")}`;
  }

  if (isYesterday(parsedDate)) {
    return `yesterday, ${format(parsedDate, "hh:mm a")}`;
  }

  if (isThisYear(parsedDate)) {
    return `${format(parsedDate, "dd MMM")}, ${format(parsedDate, "hh:mm a")}`;
  }

  return `${format(parsedDate, "dd/MM/yy")}, ${format(parsedDate, "hh:mm a")}`;
}

export default function CallsSidebar({ currentUser }: CallsSidebarProps) {
  const router = useRouter();
  const { calls, fetchAllCalls, error, loading } = useChat(currentUser?.id ?? "");
  const { startCall, audioCallLoading, videoCallLoading } = useWebRTCContext();
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Show error if available
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    fetchAllCalls();
  }, [fetchAllCalls]);

  const handleCall = async (type: string, callId: string, conversationId: string, callFrom: string, callTo: string) => {
    try {
      setActiveCallId(callId);
      await startCall(type === "VIDEO" ? "VIDEO" : "AUDIO", {
        conversationId,
        fromUserId: callFrom,
        toUserId: callTo,
      });
    } catch (error) {
      console.error("Failed to start call", error);
    } finally {
      setActiveCallId(null);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="space-y-4 p-4">
          <UserBoxSkeleton freq={8} />
        </div>
      ) : calls?.length === 0 ? (
        <p className="text-center dark:text-slate-50/80 text-black/60 py-4">No calls to show</p>
      ) : (
        <ul>
          {calls?.map((call) => {
            const isCaller = call.callerId === currentUser?.id;
            const user = isCaller ? call.callee : call.caller;

            const CallStatusIcon = () => {
              if (call.status === "MISSED") {
                return isCaller ? <PhoneOutgoing size={14} className="mt-1.5 text-red-500" /> : <PhoneIncoming size={14} className="mt-1.5 text-red-500" />;
              }
              return isCaller ? <PhoneOutgoing size={14} className="mt-1.5 text-green-500" /> : <PhoneIncoming size={14} className="mt-1.5 text-green-500" />;
            };

            return (
              <li key={call.id} className="flex relative">
                <div
                  onClick={() => router.push(`/chat/${call.conversationId}`)}
                  className="min-w-full relative flex items-center gap-3 p-3 rounded-lg transition cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 max-w-76 truncate">
                  {/* User image */}
                  <div className="relative inline-block rounded-full overflow-hidden h-10 w-10">
                    <Image src={user.image || "/images/avatar.jpg"} alt={user.name || "User"} fill className="object-cover rounded-full" />
                  </div>

                  {/* Name and call status */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between items-start">
                    <p className="font-medium truncate max-w-[99%]">{user.name ?? "User"}</p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CallStatusIcon />
                      <span className="truncate">{formatCallTime(call.startedAt)}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {activeCallId === call.id && (audioCallLoading || videoCallLoading) ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : call.type === "VIDEO" ? (
                      <Video
                        size={21}
                        className="text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleCall("VIDEO", call.id, call.conversationId, currentUser?.id ?? "", user.id);
                        }}
                      />
                    ) : (
                      <Phone
                        size={19}
                        className="text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleCall("AUDIO", call.id, call.conversationId, currentUser?.id ?? "", user.id);
                        }}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
