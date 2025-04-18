"use client";

import { Paperclip, Send, Loader2, X } from "lucide-react";
import { CldUploadButton } from "next-cloudinary";
import { MessageInputProps } from "@/types/chat";
import ToolTip from "../others/Tooltip";
import { FormError } from "@/components/auth/FormError";
import React from "react";

const MessageInputComponent = ({ message, fileUploading, msgSending, uploadError, onSend, onFileUpload, onInputChange, onClearError }: MessageInputProps) => {
  return (
    <>
      <div className={`p-2 md:mb-3 md:p-3 border-t border-t-gray-500/50 flex items-center space-x-2 justify-between bg-[#E5E7EB]/40 dark:bg-[#171717] rounded-b-lg shrink-0 `}>
        {/* file upload cloudinary button */}
        <ToolTip content="Send file">
          <CldUploadButton
            options={{
              maxFiles: 1,
              resourceType: "auto",
              multiple: false,
              tags: ["chat-attachments"],
              sources: ["local", "camera"],
              clientAllowedFormats: ["jpg", "jpeg", "png", "gif", "webp", "pdf"],
              maxFileSize: 5000000,
              cropping: false,
              showPoweredBy: false,
            }}
            onUpload={onFileUpload}
            onError={(error: Error) => {
              onClearError();
              onFileUpload({ error });
            }}>
            <div className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer relative">
              {fileUploading ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : <Paperclip className="text-gray-500 dark:hover:text-slate-50" />}
            </div>
          </CldUploadButton>
        </ToolTip>

        {/* input field for typing message */}
        <input
          type="text"
          className="w-full rounded-full bg-gray-200 dark:bg-[#212529] px-3 py-1.5 md:px-4 md:py-2 outline-none border border-gray-500/40 dark:border-gray-500/50 placeholder:text-gray-600 dark:placeholder:text-gray-400"
          placeholder="Type a message..."
          value={message}
          onChange={onInputChange}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />

        {/* send message button */}
        <button
          onClick={onSend}
          disabled={!message.trim() || fileUploading}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed">
          {msgSending ? <Loader2 className="h-5 w-5 animate-spin text-slate-50" /> : <Send size={18} />}
        </button>

        {/* error message for file upload failure */}
        {uploadError && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
            <FormError message={uploadError} />
            <button onClick={onClearError}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 px-4 py-2 rounded-md flex justify-center items-center space-x-2">
          <span>{uploadError}</span>{" "}
          <button onClick={onClearError}>
            <X className="h-4 w-4" />{" "}
          </button>{" "}
        </div> */}
      </div>
    </>
  );
};

export const MessageInput = React.memo(MessageInputComponent);
