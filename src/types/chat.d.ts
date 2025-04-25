/* eslint-disable @typescript-eslint/no-explicit-any */
import { Conversation, Message, User as PrismaUser } from "@prisma/client";

declare global {
  type User = Omit<PrismaUser, "hashedPassword"> & {
    id: string;
    name?: string | null;
    username?: string | null;
    email: string | null;
    image?: string | null;
    bio?: string | null;
    isOnline?: boolean;
    lastOnline?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

  type Conversation = Prisma.ConversationGetPayload<{
    include: {
      users: true;
      groupAdmins?: true;
      groupCreator?: true;
      messages?: {
        orderBy: { createdAt: "desc" };
        take: 1;
        include: { sender: true; seenMessage: true };
      };
    };
  }>;

  type Message = Prisma.MessageGetPayload<{
    include: { sender: true; seenMessage: true };
  }>;

  type Call = Prisma.CallGetPlayload<{
    include: { calle: true; caller: true };
  }>;
}

export interface MessageWithSender extends Message {
  seenMessage?: User[];
  sender: User;
}

export interface ConversationWithMessages extends Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  users: User[];
  groupCreator?: User | null;
  groupAdmins?: User[];
  messages: Message[];
}

export interface SeenListProps {
  seenList: User[] | null;
  currentUserId: string;
}

export interface MessageItemProps {
  msg: MessageWithSender;
  currentUserId: string;
  onDelete: (messageId: string) => void;
  seenList: User[] | null;
}

export interface MessageInputProps {
  message: string;
  fileUploading: boolean;
  msgSending: boolean;
  uploadError: string | null;
  onSend: () => void;
  onFileUpload: (result: any) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearError: () => void;
}

export interface ChatHeaderProps {
  conversation: ConversationWithMessages;
  otherUser?: User | null;
  currentUserId?: string;
}

export interface CloudinaryUploadResult {
  info?: {
    secure_url: string;
    bytes: number;
    format: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Utility types
export type PartialConversation = Pick<Conversation, "id" | "name" | "isGroup" | "groupAvatar" | "users"> & {
  lastMessage?: Message;
  unreadCount?: number;
};
