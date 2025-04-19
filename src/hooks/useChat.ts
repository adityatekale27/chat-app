"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { MessageStatus, Prisma } from "@prisma/client";
import { getPusherClient } from "@/libs/pusher/pusherClient";
import { ConversationWithMessages } from "@/types/chat";
import { useRouter } from "next/navigation";

export type SeenResponse = {
  lastMessageId: string;
  seenMessage: User[];
};

interface SeenMessagePayload {
  lastMessageId: string;
  seenMessage: Message["seenMessage"];
  status: MessageStatus;
}

type Message = Prisma.MessageGetPayload<{
  include: { sender: true; seenMessage: true };
}>;

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    users: true;
    groupAdmins: true;
    groupCreator: true;
    messages: {
      orderBy: { createdAt: "desc" };
      take: 1;
      include: { sender: true; seenMessage: true };
    };
  };
}>;

export const useChat = (currentUserId: string) => {
  const pusherClient = getPusherClient();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // fetch all conversations on chat sidebar mount
  const fetchConversations = useCallback(async (searchTerm = "") => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.get(searchTerm ? `/api/chat?search=${encodeURIComponent(searchTerm)}` : "/api/chat");
      setConversations(data);
    } catch (error: unknown) {
      if (axios.isCancel(error)) return;
      console.error("fetchConversations error:", error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to fetch conversations");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch conversation by ID
  const fetchConversationById = useCallback(
    async (conversationId: string) => {
      try {
        setMessagesLoading(true);
        setError(null);

        const { data } = await axios.get(`/api/chat/${conversationId}`);
        setCurrentConversation(data);
      } catch (error: unknown) {
        console.error("fetchConversationById error:", error);
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.message || "Failed to fetch conversation");
        } else {
          setError("An unexpected error occurred");
        }
        router.push("/");
      } finally {
        setMessagesLoading(false);
      }
    },
    [router]
  );

  // fetch messages from current conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.get(`/api/message/${conversationId}`);
      setMessages(data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to fetch messages");
      } else {
        setError("An unexpected error occurred");
      }
      console.error("fetchMessages error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // send a message
  const sendMessage = useCallback(async (conversationId: string, message: string, image?: string) => {
    setLoading(true);
    setError(null);

    if ((!message && !image) || !conversationId) {
      setError("Message or image and conversation id is required!");
      return null;
    }

    try {
      const { data } = await axios.post<Message>("/api/message", {
        message,
        image,
        conversationId,
      });

      setMessages((prev) => [...prev, data]);
      return data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to send message");
      } else {
        setError("An unexpected error occurred");
      }
      console.error("sendMessage error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // delete a message
  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    try {
      setError(null);
      await axios.delete(`/api/message/${conversationId}`, { data: { messageId } });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to delete message");
      } else {
        setError("An unexpected error occurred");
      }
      console.error("Error deleting message:", error);
      throw error;
    }
  }, []);

  // Mark messages as seen
  const seenMessages = useCallback(async (conversationId: string) => {
    try {
      const { data } = await axios.post<SeenMessagePayload>(`/api/chat/${conversationId}/seen`, { conversationId });
      setMessages((prev) => prev.map((msg) => (msg.id === data.lastMessageId ? { ...msg, status: data.status, seenMessage: data.seenMessage } : msg)));
    } catch (error) {
      console.error("seenMessages error:", error);
    }
  }, []);

  /**
   * Subscribe pusher events for conversation list
   */
  useEffect(() => {
    if (!currentUserId) return;
    const userChannel = pusherClient.subscribe(currentUserId);

    // bind new conversation
    userChannel.bind("conversation:new", (data: Conversation) => {
      setConversations((prev) => (prev.some((conversation) => conversation.id === data.id) ? prev : [...prev, data]));
    });

    // bind removed conversation
    userChannel.bind("conversation:removed", (data: { id: string }) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === data.id && c.userIds.includes(currentUserId));
        if (index === -1) return prev;
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      });
      setCurrentConversation((prev) => (prev?.id === data.id ? null : prev));
    });

    // bind conversation update
    userChannel.bind("conversation:updated", (data: { updatedConversation?: Conversation; updatedGroup?: Conversation; action: string }) => {
      if (["group_update", "admin_left", "member_left"].includes(data.action)) {
        const updated = data.updatedConversation || data.updatedGroup;
        if (!updated) return;

        setConversations((prev) => prev.map((conversation) => (conversation.id === updated.id ? { ...conversation, ...updated } : conversation)));
        setCurrentConversation((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      }
    });

    // bind last message update in conversation
    userChannel.bind("conversation:lastMessage", (updated: { id: string; message: Message[]; lastMessageAt: Date }) => {
      setConversations((prev) => {
        const index = prev.findIndex((conv) => conv.id === updated.id);
        if (index === -1) return prev;

        const newList = [...prev];
        newList[index] = {
          ...newList[index],
          messages: updated.message,
          lastMessageAt: updated.lastMessageAt,
        };

        return newList.sort((a, b) => {
          const aTime = new Date(a.lastMessageAt || 0).getTime();
          const bTime = new Date(b.lastMessageAt || 0).getTime();
          return bTime - aTime;
        });
      });
    });

    return () => {
      userChannel.unbind_all();
      userChannel.unsubscribe();
    };
  }, [currentUserId, pusherClient]);

  /**
   * Subscribe to currentConversation message pusher events
   */
  useEffect(() => {
    if (!currentConversation?.id) return;
    const channel = pusherClient.subscribe(currentConversation.id);

    // bind to new message
    channel.bind("message:new", (message: Message) => {
      setMessages((prev) => (prev.some((msg) => msg.id === message.id) ? prev : [...prev, message]));
    });

    // bind to deleted message
    channel.bind("message:deleted", (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    // bind to seen message
    channel.bind("message:seen", (data: SeenMessagePayload) => {
      setMessages((prevMsg) =>
        prevMsg.map((msg) => {
          // If it's the sender's message, and it's older or equal to the last seen one
          const isFromCurrentUser = msg.sender.id === currentUserId;
          const shouldUpdate = isFromCurrentUser && msg.id <= data.lastMessageId; // you can tweak this condition to be stricter if needed

          if (shouldUpdate) {
            return {
              ...msg,
              status: data.status,
              seenMessage: data.seenMessage,
            };
          }

          return msg;
        })
      );
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [currentConversation?.id, currentUserId, pusherClient]);

  return {
    conversations,
    messages,
    loading,
    messagesLoading,
    error,
    seenMessages,
    currentConversation,
    fetchConversationById,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setCurrentConversation,
    setConversations,
    deleteMessage,
  };
};

export default useChat;
