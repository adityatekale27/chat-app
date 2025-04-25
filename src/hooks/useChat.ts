"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { MessageStatus } from "@prisma/client";
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

export const useChat = (currentUserId: string) => {
  const pusherClient = getPusherClient();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);

  /**
   * Fetches all conversations for the current user (optionally filtered by a search term).
   */
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

  /**
   * Fetches a specific conversation by ID
   */
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

  /**
   * Fetches messages for a specific conversation
   */
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

  /**
   * Fetch all calls
   */
  const fetchAllCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.get("/api/call");
      setCalls(data);
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

  /**
   * Sends a new message (text, image) in conversation
   */
  const sendMessage = useCallback(async (conversationId: string, message: string, image?: string) => {
    setError(null);

    if ((!message && !image) || !conversationId) {
      setError("Message or image and conversation id is required!");
      return null;
    }

    try {
      setLoading(true);
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

  /**
   * Deletes a specific message froma conversation
   */
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

  /**
   * Marks messages in a conversation as seen by the current user
   */
  const seenMessages = useCallback(async (conversationId: string) => {
    try {
      const { data } = await axios.post<SeenMessagePayload>(`/api/chat/${conversationId}/seen`, { conversationId });
      setMessages((prev) => prev.map((msg) => (msg.id === data.lastMessageId ? { ...msg, status: data.status, seenMessage: data.seenMessage } : msg)));
    } catch (error) {
      console.error("seenMessages error:", error);
    }
  }, []);

  /**
   * Subscribe pusher events on the user channel (current user id),
   * handles conversation remove, update, new and lastMessage updates
   * in the conversaiton list
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
      setConversations((prev) =>
        prev
          .map((conv) =>
            conv.id === updated.id
              ? {
                  ...conv,
                  messages: updated.message,
                  lastMessageAt: updated.lastMessageAt,
                }
              : conv
          )
          .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
      );
    });

    return () => {
      userChannel.unbind_all();
      userChannel.unsubscribe();
    };
  }, [currentUserId, pusherClient]);

  /**
   * Subscribe to pusher events from currently opened conversation,
   * handle new, deleted and seen message update
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
      setMessages((prev) =>
        prev.map((msg) => (msg.sender.id === currentUserId && msg.id <= data.lastMessageId ? { ...msg, status: data.status, seenMessage: data.seenMessage } : msg))
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
    currentConversation,
    calls,
    seenMessages,
    fetchConversationById,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setCurrentConversation,
    setConversations,
    deleteMessage,
    fetchAllCalls,
  };
};

export default useChat;
