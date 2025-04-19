"use client";

import { ConversationWithMessages, MessageWithSender } from "@/types/chat";
import React, { useMemo } from "react";
import clsx from "clsx";
import { MessageOptions } from "./MessageOptions";
import { CldImage } from "next-cloudinary";

interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  otherUserOnline?: boolean;
  msgDeleting: boolean;
  onDelete: (messageId: string) => void;
  currentConversation: ConversationWithMessages;
}

/* Helper function to format the chat date for date dividers */
function formatChatDate(date: Date) {
  const today = new Date();
  const messageDate = new Date(date);

  // display 'Today' if the message is from today
  if (messageDate.toDateString() === today.toDateString()) {
    return "Today";
  }

  // dispaly 'Yesterday' if the message is from yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // if the message is from the current year, show month and day
  if (messageDate.getFullYear() === today.getFullYear()) {
    return messageDate.toLocaleDateString([], {
      month: "long",
      day: "numeric",
    });
  }

  // include the year in the date
  return messageDate.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const MessageListComponent = ({ messages, currentUserId, onDelete, msgDeleting, otherUserOnline, currentConversation }: MessageListProps) => {
  // Get and memoize unique messages
  const uniqueMessages = useMemo(() => {
    return [...new Map(messages.map((msg) => [msg.id, msg])).values()];
  }, [messages]);

  return (
    <div className="flex flex-col space-y-2 ">
      {uniqueMessages.map((msg, index) => {
        const currentDate = new Date(msg.createdAt).toDateString();
        const prevDate = index > 0 ? new Date(uniqueMessages[index - 1].createdAt).toDateString() : null;
        const showDateDivider = index === 0 || currentDate !== prevDate;

        return (
          <div key={msg.id}>
            {/* Date divider */}
            {showDateDivider && (
              <div className="flex justify-center my-5">
                <div className="bg-gray-200 dark:bg-gray-700 text-xs text-gray-600/80 dark:text-gray-300 px-3 py-1 rounded-full">{formatChatDate(new Date(msg.createdAt))}</div>
              </div>
            )}

            <div className={`relative flex ${msg.sender?.id === currentUserId ? "justify-end" : "justify-start"}`}>
              <div
                className={clsx(
                  "px-3 py-2 rounded-xl max-w-sm shadow",
                  msg.sender?.id === currentUserId ? "dark:bg-slate-800 bg-slate-800/80 text-white" : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                )}>
                {/* Display image attachment from message (if available) */}
                {msg.imageUrl && (
                  <div className="mb-1.5 mt-1 pr-2 rounded-lg overflow-hidden w-full max-w-sm h-49">
                    <CldImage
                      src={msg.imageUrl}
                      alt="Message attachment"
                      width={800}
                      height={600}
                      className={`rounded-lg object-cover w-full h-full`}
                      quality="auto"
                      fetchPriority="low"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={msg.imageUrl}
                    />
                  </div>
                )}

                {/* Message text */}
                <p className="wrap-break-word text-sm sm:text-base pr-3">{msg.text}</p>

                <div className={"flex items-center gap-1 mt-1 text-xs justify-end"}>
                  {/* Message time*/}
                  <span className="opacity-55">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {/* Message seen indicator */}
                  {msg.sender.id === currentUserId &&
                    (() => {
                      const allSeen = msg.status === "SEEN" && msg.seenMessage?.length === currentConversation?.userIds.length;
                      const someSeen = msg.status === "SEEN" && (msg.seenMessage?.length ?? 0) > 0 && !allSeen;
                      const isOneToOne = !currentConversation?.isGroup;

                      let tick = "✓";
                      let color = "text-gray-300";

                      if (allSeen) {
                        tick = "✓✓";
                        color = "text-blue-400";
                      } else if (someSeen || (isOneToOne && otherUserOnline)) {
                        tick = "✓✓";
                        color = "text-gray-300";
                      }

                      return <span className={color}>{tick}</span>;
                    })()}
                </div>
              </div>

              {/* Message options */}
              <MessageOptions message={msg} msgDeleting={msgDeleting} onDelete={onDelete} currentUserId={currentUserId || ""} seenList={msg.seenMessage!} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const MessageList = React.memo(
  MessageListComponent,
  (prev, next) =>
    prev.msgDeleting === next.msgDeleting &&
    prev.currentUserId === next.currentUserId &&
    prev.otherUserOnline === next.otherUserOnline &&
    prev.messages.length === next.messages.length &&
    prev.messages.every((msg, i) => msg.id === next.messages[i].id && msg.status === next.messages[i].status && msg.seenMessage?.length === next.messages[i].seenMessage?.length) &&
    prev.onDelete === next.onDelete
);
