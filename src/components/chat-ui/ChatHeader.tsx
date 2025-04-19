"use client";

import Image from "next/image";
import { ChevronLeft, Ellipsis, Phone, Video } from "lucide-react";
import { ChatHeaderProps } from "@/types/chat";
import React, { useState } from "react";
import { ProfileDrawer } from "../user-profile/ProfileDrawer";
import ToolTip from "../others/Tooltip";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { useRouter } from "next/navigation";

/* Helper function to format the users last online */
function formatLastOnline(date: Date): string {
  const today = new Date();
  const lastOnlineDate = new Date(date);

  const isToday = lastOnlineDate.toDateString() === today.toDateString();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = lastOnlineDate.toDateString() === yesterday.toDateString();

  if (isToday) {
    return lastOnlineDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isYesterday) {
    const time = lastOnlineDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Yesterday at ${time}`;
  }

  if (lastOnlineDate.getFullYear() === today.getFullYear()) {
    return lastOnlineDate.toLocaleDateString([], {
      month: "long",
      day: "numeric",
    });
  }

  return lastOnlineDate.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ChatHeaderComponent = ({ conversation, otherUser }: ChatHeaderProps) => {
  const router = useRouter();
  const { onlineUsers } = usePresenceContext();
  const [openProfile, setOpenProfile] = useState(false);

  return (
    <div className="p-3 sm:p-4 border-b bg-[#E5E7Eb] dark:bg-[#212529] flex justify-between items-center w-full rounded-t-lg shrink-0">
      {/* User info (profile photo and name with online indicator) */}
      <div className="flex items-center gap-2 flex-shrink min-w-0">
        <div onClick={() => router.push("/chat")} className="sm:block md:hidden hover:bg-gray-500/50 p-1 rounded-lg cursor-pointer">
          <ChevronLeft />
        </div>

        <div className="flex gap-2 items-center min-w-0">
          <div className="inline-block rounded-full overflow-hidden h-10 w-10 shrink-0">
            <Image
              src={conversation.isGroup ? conversation.groupAvatar || "/images/avatar.jpg" : otherUser?.image || "/images/avatar.jpg"}
              alt={otherUser?.name || "User"}
              height={40}
              width={40}
              className="object-conver rounded-full"
              priority
            />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm sm:text-base font-semibold truncate max-w-[140px] sm:max-w-xs">{conversation.isGroup ? conversation.name : otherUser?.name}</h2>

            {!conversation.isGroup && (
              <p className="text-xs text-gray-700/60 dark:text-gray-300/60 truncate max-w-[140px] sm:max-w-xs">
                {onlineUsers[otherUser?.id ?? ""] ? "Online" : otherUser?.lastOnline ? `${formatLastOnline(new Date(otherUser.lastOnline))}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Audio and video call buttons and conversation options */}
      <div className="flex items-center gap-2  shrink-0">
        <ToolTip content="Audio call">
          <div className="hover:bg-gray-500/50 p-1.5 rounded-lg cursor-pointer">
            <Phone size={16} onClick={() => {}} />
          </div>
        </ToolTip>

        <ToolTip content="Video call">
          <div className="hover:bg-gray-500/50 p-1.5 rounded-lg cursor-pointer">
            <Video size={19} onClick={() => {}} />
          </div>
        </ToolTip>

        <ToolTip content="Options">
          <div onClick={() => setOpenProfile(true)} className="hover:bg-gray-500/50 p-1 rounded-lg cursor-pointer">
            <Ellipsis size={21} />
          </div>
        </ToolTip>
      </div>

      {/* Profile drawer */}
      {openProfile && otherUser && <ProfileDrawer isOpen={openProfile} trigger={openProfile} onClose={() => setOpenProfile(false)} data={conversation} />}
    </div>
  );
};

export const ChatHeader = React.memo(ChatHeaderComponent, (prevProps, nextProps) => {
  return (
    prevProps.conversation.updatedAt === nextProps.conversation.updatedAt &&
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.groupAvatar === nextProps.conversation.groupAvatar &&
    prevProps.otherUser?.id === nextProps.otherUser?.id &&
    prevProps.otherUser?.image === nextProps.otherUser?.image &&
    prevProps.otherUser?.lastOnline === nextProps.otherUser?.lastOnline
  );
});
