"use client";

import { useCallback, useMemo, useState } from "react";
import { DialogBox } from "@/components/dialogs/DialogBox";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Label } from "../ui/label";

interface CreateGroupProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const groupSchema = z.object({
  name: z.string().min(2, "Group name should be at least 2 characters").max(50),
  members: z.array(z.string()).min(2, "Select at least two members"),
  groupBio: z.string().max(500, "Group bio should be less than 500 characters").optional(),
  groupAvatar: z
    .union([
      z.string().length(0),
      z
        .string()
        .url("Invalid image URL")
        .refine((url) => url.startsWith("https://"), "Must be a secure HTTPS URL"),
    ])
    .optional()
    .transform((e) => (e === "" ? undefined : e)),
});

// variables for group avatar upload
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/jpg"];

export const CreateGroup = ({ isOpen, onClose, currentUser }: CreateGroupProps) => {
  const router = useRouter();
  const { friends } = useFriendRequests(currentUser.id);
  const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);

  const friendsList = useMemo(() => {
    return friends.map((friend) => (friend.senderId === currentUser.id ? friend.receiver : friend.sender)).filter(Boolean) as User[];
  }, [currentUser.id, friends]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      groupBio: "",
      groupAvatar: "",
      members: [],
    },
  });

  const name = watch("name");
  const groupAvatar = watch("groupAvatar");
  const members = watch("members");

  // members add handler
  const toggleMemberSelection = useCallback(
    (friend: User) => {
      const currentMembers = [...members];
      const index = currentMembers.indexOf(friend.id);

      if (index === -1) {
        currentMembers.push(friend.id);
      } else {
        currentMembers.splice(index, 1);
      }

      setValue("members", currentMembers);
    },
    [members, setValue]
  );

  // group avatar handler
  const handleGroupAvatar = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        setGroupAvatarUploading(true);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!VALID_FILE_TYPES.includes(file.type)) {
          throw new Error("Only JPEG, PNG, and GIF images are allowed");
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error("File size must be less than 2MB");
        }

        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("upload_preset", String(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!));
        uploadData.append("cloud_name", String(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!));

        const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadData });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Upload failed");
        }

        const { secure_url } = await response.json();
        setValue("groupAvatar", secure_url);
        toast.success("Group avatar photo updated!");
      } catch (error) {
        console.log("Profile photo Upload error:", error);
        toast.error(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setGroupAvatarUploading(false);
        if (e.target) e.target.value = "";
      }
    },
    [setValue]
  );

  // group creataion handler
  const onSubmit = useCallback(
    async (data: z.infer<typeof groupSchema>) => {
      try {
        await axios.post("/api/chat", {
          isGroup: true,
          name: data.name,
          members: data.members,
          groupBio: data.groupBio,
          groupAvatar: data.groupAvatar,
        });

        toast.success("Group created successfully!");
        router.refresh();
        onClose();
        reset();
      } catch (error) {
        toast.error("Failed to create group. Please try again.");
        console.log("Group creation error:", error);
      }
    },
    [onClose, reset, router]
  );

  return (
    <DialogBox isOpen={isOpen} onClose={onClose} trigger={isOpen} dialogTitle="Create group" dialogDescription="Start a new conversation with your friends in one place.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-2">
        <div className="flex items-start gap-4">
          {/* group avatar section */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border">
              {groupAvatarUploading ? (
                <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-gray-500/50">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <Image src={groupAvatar || "/images/avatar.jpg"} alt={name || "Group name"} fill className="object-cover" priority={isOpen} />
              )}
            </div>

            {/* profile photo upload button */}
            <input type="file" id="profile-upload" accept="image/*" className="hidden" onChange={handleGroupAvatar} disabled={groupAvatarUploading || isSubmitting} />
            <label htmlFor="profile-upload" className="dark:bg-tranparent hover:bg-gray-300/50 border px-3 py-1 text-sm dark:hover:bg-[#212121] cursor-pointer rounded-lg">
              Upload
            </label>
          </div>

          {/* group name section*/}
          <div className="flex-1 space-y-2  mt-1">
            <Label htmlFor="name">Group Name *</Label>
            <Input id="name" placeholder="Enter group name" {...register("name")} disabled={isSubmitting} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            {errors.groupAvatar && <p className="text-sm text-red-500 pt-1">{errors.groupAvatar.message}</p>}
          </div>
        </div>

        {/* group bio section */}
        <div className="space-y-2">
          <Label htmlFor="groupBio">Group Description</Label>
          <Input id="groupBio" placeholder="What's this group about?" {...register("groupBio")} disabled={isSubmitting} />
          {errors.groupBio && <p className="text-sm text-red-500">{errors.groupBio.message}</p>}
        </div>

        {/* group members section section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Select Members *</Label>
            <span className="text-sm text-gray-500">{members.length} selected</span>
          </div>
          {errors.members && <p className="text-sm text-red-500">{errors.members.message}</p>}

          <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
            {friendsList.length === 0 ? (
              <p className="text-sm text-gray-500 py-2 text-center">No friends available</p>
            ) : (
              friendsList.map((friend) => (
                <div key={friend.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md transition-colors">
                  <label className="flex items-center w-full cursor-pointer">
                    <Checkbox checked={members.includes(friend.id)} onCheckedChange={() => toggleMemberSelection(friend)} className="mr-3" />
                    <div className="flex items-center flex-1">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={friend.image || "/images/avatar.jpg"} />
                      </Avatar>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{friend.name}</p>
                        {friend.username ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{friend.username}</p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{friend.email}</p>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              reset();
            }}
            disabled={isSubmitting}
            className="cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || members.length === 0 || !name.trim()} className="cursor-pointer">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </div>
      </form>
    </DialogBox>
  );
};

//     <DialogBox isOpen={isOpen} onClose={onClose} trigger={isOpen} dailogTitle="Create group" dialogDescription="Start a new conversation with your friends in one place.">
//       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//         {/* Group Name Input */}
//         <div className="space-y-2">
//           <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-100">
//             Group Name
//           </label>
//           <Input id="name" placeholder="Enter group name" {...register("name")} disabled={isSubmitting} />
//           {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
//         </div>

//         {/* Group Avatar Input */}
//         <div className="space-y-2">
//           <label htmlFor="groupAvatar" className="block text-sm font-medium text-gray-700 dark:text-gray-100">
//             Group Avatar URL (optional)
//           </label>
//           <Input id="groupAvatar" placeholder="https://example.com/avatar.jpg" {...register("groupAvatar")} disabled={isSubmitting} />
//           {errors.groupAvatar && <p className="text-sm text-red-500">{errors.groupAvatar.message}</p>}
//         </div>

//         {/* Group Bio Input */}
//         <div className="space-y-2">
//           <label htmlFor="groupBio" className="block text-sm font-medium text-gray-700 dark:text-gray-100">
//             Group Bio (optional)
//           </label>
//           <Input id="groupBio" placeholder="Enter a short description for your group" {...register("groupBio")} disabled={isSubmitting} />
//           {errors.groupBio && <p className="text-sm text-red-500">{errors.groupBio.message}</p>}
//         </div>

//         {/* Members Selection */}
//         <div className="space-y-2">
//           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Members ({members.length} selected)</label>
//           {errors.members && <p className="text-sm text-red-500">{errors.members.message}</p>}

//           <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
//             {friendsList.length === 0 ? (
//               <p className="text-sm text-gray-500 py-2 text-center">No friends available</p>
//             ) : (
//               friendsList.map((friend) => (
//                 <div
//                   key={friend.id}
//                   className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
//                   onClick={() => toggleMemberSelection(friend)}>
//                   <Checkbox checked={members.includes(friend.id)} onCheckedChange={() => toggleMemberSelection(friend)} className="mr-3" />
//                   <Avatar className="h-9 w-9">
//                     <AvatarImage src={friend.image || undefined} />
//                     <AvatarFallback>{friend.name?.charAt(0).toUpperCase()}</AvatarFallback>
//                   </Avatar>
//                   <div className="ml-3">
//                     <p className="text-sm font-medium">{friend.name}</p>
//                     <p className="text-xs text-gray-500 dark:text-gray-400">@{friend.username}</p>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-end gap-2 pt-4">
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => {
//               onClose();
//               reset();
//             }}
//             disabled={isSubmitting}>
//             Cancel
//           </Button>
//           <Button type="submit" disabled={isSubmitting || members.length === 0 || !name.trim()}>
//             {isSubmitting ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 Creating...
//               </>
//             ) : (
//               "Create Group"
//             )}
//           </Button>
//         </div>
//       </form>
//     </DialogBox>
