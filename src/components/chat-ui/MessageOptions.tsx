"use client";

import { Trash2, Download, Eye, EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Message } from "@prisma/client";
import React, { useState } from "react";
import Image from "next/image";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import toast from "react-hot-toast";

interface MessageOptionsProps {
  message: Message & { sender: User };
  onDelete: (messageId: string) => void;
  currentUserId: string;
  seenList: User[];
  msgDeleting: boolean;
  setView: () => void;
  setDownload: () => void;
}

const MessageOptionsComponent = ({ message, onDelete, currentUserId, seenList, msgDeleting, setView, setDownload }: MessageOptionsProps) => {
  const [deleteConfimation, setDeleteConfirmation] = useState(false);
  const seenByOthers = seenList.filter((u) => u.id !== currentUserId);

  return (
    <>
      {/* Current user can only view and download the image from Other user */}
      {message.sender.id !== currentUserId && message.imageUrl ? (
        <div className="absolute top-1 left-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-400 dark:hover:bg-gray-900">
              <EllipsisVertical size={16} className="text-gray-600 hover:text-white dark:text-gray-400 cursor-pointer" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={setView} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Eye size={14} />
                  <span>View</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={setDownload} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Download size={14} />
                  <span>Download</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : message.sender.id === currentUserId ? (
        <div className="absolute top-1 right-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500/50">
              <EllipsisVertical size={16} className="text-slate-50 hover:text-white dark:text-gray-300 cursor-pointer" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {/* Options for image (view and download) */}
              {message.imageUrl && (
                <>
                  <DropdownMenuItem onClick={setView} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Eye size={14} />
                      <span>View</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={setDownload} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Download size={14} />
                      <span>Download</span>
                    </div>
                  </DropdownMenuItem>
                </>
              )}

              {/* Copy message text (only if message is not image) */}
              {!message.imageUrl && (
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(message.text || "");
                    toast.success("Message copied!");
                  }}
                  className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Download size={14} />
                    <span>Copy</span>
                  </div>
                </DropdownMenuItem>
              )}

              {/* List of users, who seen the message */}
              {seenByOthers.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DropdownMenuItem className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Eye size={14} />
                        <span>Message seen</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40 max-h-50 overflow-y-auto" align="end" style={{ transform: "translateX(-50px)" }}>
                    <DropdownMenuLabel className="flex justify-between items-center">
                      <span>Seen by</span>
                      <span className="text-muted-foreground text-xs">{seenByOthers.length}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {seenByOthers.map((user) => (
                        <DropdownMenuItem key={user.id} className="flex items-center gap-2 px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <Image src={user.image || "/images/avatar.jpg"} alt={user.name || "User"} width={20} height={20} className="rounded-full object-cover shrink-0" />
                            <span className="truncate">{user.name}</span>
                          </div>
                          <span className="ml-auto text-xs text-blue-400">✓✓</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Seperator */}
              {(message.imageUrl || seenList?.length) && <DropdownMenuSeparator />}

              {/* Delete message button */}
              <DropdownMenuItem
                onClick={() => setDeleteConfirmation(true)}
                className="text-red-600 focus:text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/30 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Trash2 size={14} />
                  <span>Delete</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {/* Delete message confirmation box */}
      <ConfirmationDialog
        open={deleteConfimation}
        loading={msgDeleting}
        onOpenChange={setDeleteConfirmation}
        title="Are you sure!"
        description="Click confirm if you want to permanently delete this message."
        onConfirm={() => onDelete(message.id)}
      />
    </>
  );
};

export const MessageOptions = React.memo(
  MessageOptionsComponent,
  (prevProps, nextProps) =>
    prevProps.msgDeleting === nextProps.msgDeleting &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.message.id === nextProps.message.id &&
    prevProps.seenList.length === nextProps.seenList.length &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.seenList.map((u) => u.id) === nextProps.seenList.map((u) => u.id)
);
