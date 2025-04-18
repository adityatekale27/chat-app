"use client";

import EmptyState from "@/components/loading-states/EmptyState";
import toast from "react-hot-toast";
import useChat from "@/hooks/useChat";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatHeader } from "@/components/chat-ui/ChatHeader";
import { MessageList } from "@/components/chat-ui/MessageList";
import { MessageInput } from "@/components/chat-ui/MessageInput";
import { ChatSkeleton } from "@/components/loading-states/LoadingSkeleton";

const ChatPage = () => {
  const { data: session } = useSession();
  const currentUser = session?.user;
  const { conversationId } = useParams();
  const { fetchMessages, messages, sendMessage, deleteMessage, currentConversation, fetchConversationById, messagesLoading, seenMessages } = useChat(currentUser?.id ?? "");

  const [isUnfriended, setIsUnfriended] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [message, setMessage] = useState("");

  /**
   * Fetch current conversation and message on page load
   * or conversationId changes, also mark messages as seen
   */
  useEffect(() => {
    if (conversationId) {
      fetchConversationById(conversationId as string);
      fetchMessages(conversationId as string);
      seenMessages(conversationId as string);
    }
  }, [conversationId, fetchConversationById, fetchMessages, seenMessages]);

  /**
   * Call seen messages method. when lastMessage sender is not current user,
   * if that message status is not 'SEEN'. If these conditions are true,
   * then call seen message.
   */
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isFromOtherUser = lastMessage.sender.id !== currentUser?.id;
      const isNotSeen = lastMessage.status !== "SEEN";

      if (isFromOtherUser && isNotSeen) {
        seenMessages(conversationId as string);
      }
    }
  }, [conversationId, currentUser?.id, messages, seenMessages]);

  /* Find the other user in one to one chat */
  const otherUser = useMemo(() => {
    return currentConversation?.users.find((user) => user.id !== currentUser?.id);
  }, [currentConversation?.users, currentUser?.id]);

  /* Send new message */
  const handleSendMessage = useCallback(async () => {
    try {
      setMsgSending(true);
      if (!message.trim() || !currentConversation?.id) return;
      await sendMessage(currentConversation.id as string, message);
    } catch (error) {
      toast.error("Failed to send message");
      console.log("handleSendMessage error:", error);
    } finally {
      setMessage("");
      setMsgSending(false);
    }
  }, [currentConversation?.id, message, sendMessage]);

  /* Delete a message using id, from the current conversation */
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        if (!currentConversation?.id || !currentUser?.id || !messageId) return;
        await deleteMessage(currentConversation.id as string, messageId);
        toast.success("Message deleted!");
      } catch (error) {
        toast.error("Failed to delete message");
        console.log("handleDeleteMessage error", error);
      }
    },
    [currentConversation?.id, currentUser?.id, deleteMessage]
  );

  /* Handle file upload using cloudinary */
  const handleFileUpload = useCallback(
    async (result: { info?: { secure_url: string; bytes: number; format: string } }) => {
      try {
        setFileUploading(true);
        setUploadError(null);

        if (!result.info?.secure_url) {
          throw new Error("No secure URL returned from cloudinary");
        }

        // check file size (5MB limit)
        if (result.info.bytes > 5 * 1024 * 1024) {
          throw new Error("File size exceeds 5MB limit");
        }

        // check file type
        const validExtensions = ["jpg", "jpeg", "png", "gif", "pdf"];
        const fileExtension = result.info.format.toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
          throw new Error("Invalid file type. Only images and PDFs are allowed");
        }

        await sendMessage(currentConversation?.id as string, "", result.info.secure_url);

        toast.success("File uploaded!");
      } catch (error) {
        console.log("Failed to upload file:", error);
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setFileUploading(false);
      }
    },
    [currentConversation?.id, sendMessage]
  );

  /* Handle loading and empty states */
  if (messagesLoading) return <ChatSkeleton />;
  if (!currentConversation) return <EmptyState />;

  return (
    <div className="h-[100dvh] w-full flex flex-col rounded-lg">
      <ChatHeader conversation={currentConversation} otherUser={otherUser} unfriended={() => setIsUnfriended(true)} />

      <div className="flex-1 flex flex-col-reverse overflow-y-auto px-3 sm:px-4 py-5 sm:py-5 bg-[#fffbfe] dark:bg-[#171717]">
        {messages.length > 0 ? (
          <MessageList
            currentConversation={currentConversation}
            messages={messages}
            currentUserId={currentUser?.id || ""}
            onDelete={handleDeleteMessage}
            otherUserOnline={otherUser?.isOnline}
          />
        ) : (
          <p className="text-center text-gray-500 dark:text-slate-50/50 py-4 sm:text-base">No messages yet</p>
        )}
      </div>

      {isUnfriended ? (
        <div className=" md:mb-3 border-t border-t-gray-500/50 flex items-center justify-between bg-[#E5E7EB]/40 dark:bg-[#171717] rounded-b-lg shrink-0">
          <div className="mx-auto my-4 text-center max-w-xs md:max-w-lg rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-4 py-2 text-sm sm:text-base shadow-sm border border-red-200 dark:border-red-700">
            {"You are no longer friends. You can't send messages in this chat."}
          </div>
        </div>
      ) : (
        <MessageInput
          message={message}
          fileUploading={fileUploading}
          msgSending={msgSending}
          uploadError={uploadError}
          onSend={handleSendMessage}
          onFileUpload={handleFileUpload}
          onInputChange={(e) => setMessage(e.target.value)}
          onClearError={() => setUploadError(null)}
        />
      )}
    </div>
  );
};

export default ChatPage;
