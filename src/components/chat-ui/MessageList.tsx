"use client";

import { ConversationWithMessages, MessageWithSender } from "@/types/chat";
import React, { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { MessageOptions } from "./MessageOptions";
import { CldImage } from "next-cloudinary";
import ToolTip from "../others/Tooltip";
import Image from "next/image";
import { Download, X } from "lucide-react";
import toast from "react-hot-toast";

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
  const [previewOpen, setPreviewOpen] = useState("");

  /* Image download handler */
  const handleFileDownload = useCallback((messageURL: string) => {
    if (!messageURL) return;

    const urlParts = messageURL.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");
    const publicId = urlParts
      .slice(uploadIndex + 2)
      .join("/")
      .split(".")[0];

    const downloadUrl = messageURL.replace(/upload\/.*\//, "upload/fl_attachment/");

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `download-${publicId.split("/").pop()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("File downloading!");
  }, []);

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
                  "px-3 py-2 rounded-xl md:max-w-sm max-w-xs shadow",
                  msg.sender?.id === currentUserId ? "dark:bg-slate-800 bg-slate-800/80 text-white" : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                )}>
                {/* Display image attachment from message (if available) */}
                {msg.imageUrl && (
                  <div onClick={() => setPreviewOpen(msg.id)} className="mb-1.5 mt-1 pr-2 rounded-lg overflow-hidden w-full max-w-sm h-49 hover:cursor-pointer">
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
              <MessageOptions
                message={msg}
                msgDeleting={msgDeleting}
                setView={() => setPreviewOpen(msg.id)}
                onDelete={onDelete}
                setDownload={() => handleFileDownload(msg.imageUrl ?? "")}
                currentUserId={currentUserId || ""}
                seenList={msg.seenMessage!}
              />

              {/* File preview */}
              {previewOpen === msg.id && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-auto">
                  <div className="relative w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                    <div className="flex-1 relative">
                      <Image src={msg.imageUrl ?? ""} alt="File Preview" fill className="object-contain" quality={100} priority />
                    </div>
                    <div className="flex justify-center items-center gap-3 mt-4">
                      {/* download button */}
                      <ToolTip content="Download">
                        <button
                          onClick={() => handleFileDownload(msg.imageUrl ?? "")}
                          className="p-2 bg-slate-800 text-white rounded-lg hover:bg-blue-600/80 transition-colors cursor-pointer">
                          <Download size={18} />
                        </button>
                      </ToolTip>

                      {/* close button */}
                      <ToolTip content="Close">
                        <button onClick={() => setPreviewOpen("")} className="p-1 bg-gray-600/70 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer">
                          <X size={22} />
                        </button>
                      </ToolTip>
                    </div>
                  </div>
                </div>
              )}
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
