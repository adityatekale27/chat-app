"use client";

import { Trash2, Download, Eye, X, EllipsisVertical } from "lucide-react";
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
import React, { useCallback, useState } from "react";
import Image from "next/image";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import ToolTip from "../others/Tooltip";
import toast from "react-hot-toast";

interface MessageOptionsProps {
  message: Message & { sender: User };
  onDelete: (messageId: string) => void;
  currentUserId: string;
  seenList: User[];
}

const MessageOptionsComponent = ({ message, onDelete, currentUserId, seenList }: MessageOptionsProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfimation, setDeleteConfirmation] = useState(false);

  /* Image download handler */
  const handleFileDownload = useCallback(() => {
    if (!message.imageUrl) return;

    const urlParts = message.imageUrl.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");
    const publicId = urlParts
      .slice(uploadIndex + 2)
      .join("/")
      .split(".")[0];

    const downloadUrl = message.imageUrl.replace(/upload\/.*\//, "upload/fl_attachment/");

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `download-${publicId.split("/").pop()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("File downloading!");
  }, [message.imageUrl]);

  console.log("seenList", seenList);
  const seenByOthers = seenList.filter((u) => u.id !== currentUserId);
  console.log("seenByOthers", seenByOthers);

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
              <DropdownMenuItem onClick={() => setPreviewOpen(true)} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Eye size={14} />
                  <span>View</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFileDownload} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
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
                  <DropdownMenuItem onClick={() => setPreviewOpen(true)} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <Eye size={14} />
                      <span>View</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFileDownload} className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
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

      {/* File preview */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="relative w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
            <div className="flex-1 relative">
              <Image src={message.imageUrl ?? ""} alt="File Preview" fill className="object-contain" quality={100} priority />
            </div>
            <div className="flex justify-center items-center gap-3 mt-4">
              {/* download button */}
              <ToolTip content="Download">
                <button onClick={handleFileDownload} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-blue-600/80 transition-colors cursor-pointer">
                  <Download size={18} />
                </button>
              </ToolTip>

              {/* close button */}
              <ToolTip content="Close">
                <button onClick={() => setPreviewOpen(false)} className="p-1 bg-gray-600/70 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer">
                  <X size={22} />
                </button>
              </ToolTip>
            </div>
          </div>
        </div>
      )}

      {/* Delete message confirmation box */}
      <ConfirmationDialog
        open={deleteConfimation}
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
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.message.id === nextProps.message.id &&
    prevProps.seenList.length === nextProps.seenList.length &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.seenList.map((u) => u.id) === nextProps.seenList.map((u) => u.id)
);
