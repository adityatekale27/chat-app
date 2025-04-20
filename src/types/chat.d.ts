/* eslint-disable @typescript-eslint/no-explicit-any */
import { Conversation as PrismaConversation, Message as PrismaMessage, User as PrismaUser } from "@prisma/client";

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

  type Conversation = PrismaConversation & {
    users: User[];
    groupAdmins?: User[];
    groupCreator?: User;
    messages?: Message[];
  };

  type Message = PrismaMessage & {
    sender?: User;
    seenMessage?: User[];
  };
}

export interface MessageWithSender extends Message {
  sender: User;
}

export interface ConversationWithMessages extends Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
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
  otherUser?: User;
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
