"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Path, useForm, UseFormRegister, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import axios from "axios";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import clsx from "clsx";
import { useFriendRequests } from "@/hooks/useFriendRequests";

interface User {
  id: string;
  name?: string | null;
  username?: string | null;
  email: string;
  image?: string | null;
  bio?: string | null;
  hasPassword?: boolean;
}

interface Group {
  id: string;
  name: string | null;
  groupBio?: string | null;
  groupAvatar?: string | null;
  users: User[];
  groupAdmins?: User[];
}

interface EditProfileOrGroupProps {
  mode: "user" | "group";
  user?: User;
  group?: Group;
  open: boolean;
  onChange: () => void;
}

/* Zod schema for user */
const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores allowed")
    .optional(),
  image: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z
      .string()
      .url("Invalid image URL")
      .refine((url) => url.startsWith("https://"), "Must be a secure HTTPS URL")
      .optional()
  ),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === "" || val.length >= 8, {
      message: "New Password must be at least 8 characters",
    })
    .refine((val) => val === undefined || val === "" || /[A-Z]/.test(val), {
      message: "New Password must contain at least one uppercase letter",
    })
    .refine((val) => val === undefined || val === "" || /[0-9]/.test(val), {
      message: "New Password must contain at least one number",
    }),
});
type UserFormData = z.infer<typeof userSchema>;

// Zod schema for group
const groupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").max(50),
  groupBio: z.string().max(500, "Group bio cannot exceed 500 characters").optional(),
  groupAdmins: z.array(z.string()).optional(),
  users: z.array(z.string()).min(2, "Select at least two members"),
  groupAvatar: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z
      .string()
      .url("Invalid image URL")
      .refine((url) => url.startsWith("https://"), "Must be a secure HTTPS URL")
      .optional()
  ),
});
type GroupFormData = z.infer<typeof groupSchema>;

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const VALID_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/jpg"];

export default function EditProfile({ mode, user, group, onChange, open }: EditProfileOrGroupProps) {
  const { data: session, update } = useSession();
  const currentUser = session?.user;
  const { friends } = useFriendRequests(currentUser?.id ?? "");

  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changeGroupAdmins, setChangeGroupAdmins] = useState(false);
  const [selectMoreUsers, setSelectMoreUsers] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [addNewPassword, setAddNewPassword] = useState(false);

  // Schema and default values based on mode
  const schema = mode === "user" ? userSchema : groupSchema;
  const defaultValues =
    mode === "user"
      ? {
          name: user?.name || "",
          username: user?.username || "",
          image: user?.image || "",
          bio: user?.bio || "",
          currentPassword: "",
          newPassword: "",
        }
      : {
          name: group?.name || "",
          groupBio: group?.groupBio || "",
          groupAvatar: group?.groupAvatar || "",
          groupAdmins: group?.groupAdmins?.map((admin) => admin.id) || [],
          users: group?.users?.map((member) => member.id) || [],
        };

  /* Initialize the useForm with default values */
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData | GroupFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Watch values
  const userImageUrl = watch("image");
  const groupAvatarUrl = watch("groupAvatar");
  const groupUsers = useMemo(() => watch("users") || [], [watch]);
  const groupAdmins = watch("groupAdmins");

  /* Admin friend list, exclude group members */
  const isAdmin = group?.groupAdmins?.some((admin) => admin.id === currentUser?.id);
  const adminFriendsList = useMemo(() => {
    if (!isAdmin) return [];
    return friends.map((friend) => (friend.sender.id === currentUser?.id ? friend.receiver : friend.sender)).filter((user) => !groupUsers.includes(user.id));
  }, [currentUser?.id, friends, groupUsers, isAdmin]);

  /* Toggle selection of group admins and group members */
  const toggleSelection = useCallback(
    <T extends string>(id: T, key: "users" | "groupAdmins", currentList: T[]) => {
      const updatedList = currentList.includes(id) ? currentList.filter((item) => item !== id) : [...currentList, id];
      setValue(key, updatedList);
    },
    [setValue]
  );

  // Builds a lookup map of all known users (from group and friends).
  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    group?.users?.forEach((u) => map.set(u.id, u));
    friends.map((f) => (f.sender.id === currentUser?.id ? f.receiver : f.sender)).forEach((u) => map.set(u.id, u));
    return map;
  }, [group?.users, friends, currentUser?.id]);

  // Gets full user objects for group user IDs using the lookup map.
  const groupUserObjects = useMemo(() => groupUsers.map((id) => usersById.get(id)).filter((u): u is User => !!u), [groupUsers, usersById]);

  /* File select handler for group avatar or user image */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        setUploading(true);
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

        if (mode === "user") {
          setValue("image", secure_url);
        } else {
          setValue("groupAvatar", secure_url);
        }

        toast.success("Avatar updated successfully!");
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setUploading(false);
        if (e.target) e.target.value = "";
      }
    },
    [mode, setValue]
  );

  /* Validate form values and perform submit */
  const handleFormSubmit = useCallback(
    async (data: UserFormData | GroupFormData) => {
      try {
        if (mode === "user") {
          const response = await axios.patch(`/api/users/me`, {
            userId: user?.id,
            formData: data,
          });

          await update({
            ...session,
            user: {
              ...session?.user,
              ...response.data,
            },
          });

          toast.success("Profile updated successfully");
        } else {
          await axios.patch(`/api/chat/${group?.id}`, {
            conversationId: group?.id,
            formData: data,
          });

          toast.success("Group updated successfully");
        }
      } catch (error: unknown) {
        console.log("editProfile error:", error);
        if (axios.isAxiosError(error) && error.response?.data) {
          toast.error(error.response.data.error || error.response.data.message || "Update failed");
        } else {
          toast.error("Update failed");
        }
      } finally {
        onChange();
      }
    },
    [group?.id, mode, onChange, session, update, user?.id]
  );

  return (
    <>
      {/* Header: group name/user name, group avatar/user image and edit button*/}
      <CardHeader>
        <div className="flex items-start justify-between">
          {/* User or group name*/}
          <div className="self-center">
            <CardTitle className="pb-2">{mode === "user" ? "Edit Profile" : "Edit Group"}</CardTitle>
            <CardDescription className="max-w-[90%]">
              {mode === "user"
                ? "Update your profile information. Your name, username, bio, and avatar will be visible to others."
                : "Update your group information including group name, bio, avatar, and manage group admins."}
            </CardDescription>
          </div>
          <div className="flex flex-col items-center gap-2">
            {/* User or group avatar */}
            <div className="relative h-15 w-15 rounded-full overflow-hidden border">
              {uploading ? (
                <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-gray-500/50">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <Image
                  src={
                    open
                      ? userImageUrl || (mode === "user" && user?.image) || "/images/avatar.jpg"
                      : groupAvatarUrl || (mode === "group" && group?.groupAvatar) || "/images/avatar.jpg"
                  }
                  alt={mode === "user" ? user?.name || "Profile" : group?.name || "Group"}
                  fill
                  className="object-cover"
                  priority
                />
              )}
            </div>

            {/* File upload trigger */}
            <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading || isSubmitting} />
            <label htmlFor="avatar-upload" className="dark:bg-transparent hover:bg-gray-300/50 border px-3 py-1 text-sm dark:hover:bg-[#212121] cursor-pointer rounded-lg">
              Change
            </label>
          </div>
        </div>
        <div className="flex justify-end pt-1">
          {errors && "groupAvatar" in errors && <p className="text-sm text-red-500">{errors.groupAvatar?.message as string}</p>}
          {errors && "image" in errors && <p className="text-sm text-red-500">{errors.image?.message as string}</p>}
        </div>
      </CardHeader>

      {/* Content: name, bio, username, password change toggle */}
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit as SubmitHandler<UserFormData | GroupFormData>)} className="space-y-6">
          {mode === "user" ? (
            <>
              {/* Name Field */}
              <ProfileField
                type="text"
                htmlId="name"
                label="Name"
                register={register}
                disabled={isSubmitting}
                errorMessage={errors && "name" in errors && <p className="text-sm text-red-500">{errors.name?.message as string}</p>}
              />

              {/* Username Field */}
              <ProfileField
                type="text"
                htmlId="username"
                label="Username"
                register={register}
                disabled={isSubmitting}
                errorMessage={errors && "username" in errors && <p className="text-sm text-red-500">{errors.username?.message as string}</p>}
              />

              {/* Bio Field */}
              <ProfileField
                type="text"
                htmlId="bio"
                rows={2}
                label="Bio"
                register={register}
                disabled={isSubmitting}
                errorMessage={errors && "bio" in errors && <p className="text-sm text-red-500">{errors.bio?.message as string}</p>}
              />

              {/* Change password toggle, if current password is available */}
              {user?.hasPassword && (
                <div className="flex justify-between items-center bg-transparent outline outline-gray-500/30 rounded-lg py-3 px-4">
                  <div className="space-y-2">
                    <Label>Change password?</Label>
                    <p className="text-xs text-muted-foreground max-w-[95%]">Enable this option to change your account password.</p>
                  </div>
                  <Switch checked={showChangePassword} onCheckedChange={(checked) => setShowChangePassword(checked)} className="cursor-pointer" />
                </div>
              )}

              {/* Change passowrd field */}
              {user?.hasPassword && showChangePassword && (
                <>
                  <ProfileField
                    type={showPassword ? "text" : "password"}
                    htmlId="currentPassword"
                    label="Current Password"
                    register={register}
                    disabled={isSubmitting}
                    errorMessage={errors && "currentPassword" in errors && <p className="text-sm text-red-500">{errors.currentPassword?.message as string}</p>}
                  />
                  <div className="relative space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type={showPassword ? "text" : "password"} {...register("newPassword")} disabled={isSubmitting} />
                    <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-6 cursor-pointer" type="button">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    {errors && "newPassword" in errors && <p className="text-sm text-red-500">{errors.newPassword?.message as string}</p>}
                  </div>
                </>
              )}

              {/* Set new password toggle, if current password is not available */}
              {!user?.hasPassword && (
                <div className="flex justify-between items-center bg-transparent outline outline-gray-500/30 rounded-lg py-3 px-4">
                  <div className="space-y-2">
                    <Label>Set new password?</Label>
                    <p className="text-xs text-muted-foreground max-w-[95%]">You don&apos;t have password for this account! Enable this to set a new password for your account.</p>
                  </div>
                  <Switch checked={addNewPassword} onCheckedChange={(checked) => setAddNewPassword(checked)} className="cursor-pointer" />
                </div>
              )}

              {/* Set new password field */}
              {!user?.hasPassword && addNewPassword && (
                <div className="relative space-y-2">
                  <Label htmlFor="newPassword">New Password </Label>
                  <Input id="newPassword" type={showPassword ? "text" : "password"} {...register("newPassword")} disabled={isSubmitting} />
                  <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-6 cursor-pointer" type="button">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  {errors && "newPassword" in errors && <p className="text-sm text-red-500">{errors.newPassword?.message as string}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Group name field */}
              <ProfileField
                type="text"
                htmlId="name"
                label="Group Name"
                register={register}
                disabled={isSubmitting}
                errorMessage={errors && "name" in errors && <p className="text-sm text-red-500">{errors.name?.message as string}</p>}
              />

              {/* Group bio field */}
              <ProfileField
                type="text"
                htmlId="groupBio"
                label="Group Bio"
                rows={2}
                register={register}
                disabled={isSubmitting}
                errorMessage={errors && "groupBio" in errors && <p className="text-sm text-red-500">{errors.groupBio?.message as string}</p>}
              />

              {/* Select group members and group admins */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Select Group Members</Label>
                  <span className="text-sm text-gray-500">{!changeGroupAdmins ? `${groupUsers.length} selected` : `${groupAdmins?.length} selected`}</span>
                </div>

                {/* Group members */}
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
                  <h3 className="text-sm font-semibold mb-2 ml-2">Manage Members</h3>
                  {groupUserObjects.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2 text-center">No members available</p>
                  ) : (
                    groupUserObjects.map((member) => {
                      const isProtected = member.id === currentUser?.id && groupAdmins?.includes(currentUser.id);

                      return (
                        <div
                          key={member.id}
                          className={`flex items-center p-2 rounded-md ${!isProtected ? "hover:bg-gray-100 dark:hover:bg-gray-700/70" : "bg-gray-100 dark:bg-gray-800/40"}`}>
                          <label className="flex items-center w-full cursor-pointer relative">
                            {!isProtected && (
                              <Checkbox checked={groupUsers.includes(member.id)} onCheckedChange={() => toggleSelection(member.id, "users", groupUsers)} className="mr-3" />
                            )}
                            <div className="flex items-center justify-start flex-1">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={member.image || "/images/avatar.jpg"} />
                              </Avatar>
                              <div className="font-medium text-sm ml-3">
                                <p className="flex items-center gap-1 max-w-50 truncate overflow-hidden">
                                  <span className="max-w-25 truncate overflow-hidden">{member.name}</span>{" "}
                                  {groupAdmins?.includes(member.id) && (
                                    <span className="leading-none bg-gray-500/30 px-1 py-0.5 rounded-lg text-muted-foreground text-xs max-w-25 truncate overflow-hidden">
                                      Admin
                                    </span>
                                  )}
                                </p>

                                <p className="text-muted-foreground text-xs max-w-40 truncate overflow-x-hidden">{member.email ?? ""}</p>
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
                {errors && "users" in errors && <p className="text-sm text-red-500">{errors.users?.message as string}</p>}
                {errors && "groupAdmins" in errors && <p className="text-sm text-red-500">{errors.groupAdmins?.message as string}</p>}

                {/* Toggle button: select group admins */}
                <div className="flex flex-col justify-between items-center bg-transparent outline outline-gray-500/30 rounded-lg py-3 px-4">
                  {/* Header: Toggle Switch and Label */}
                  <div className="flex w-full justify-between items-start">
                    <div className="space-y-2 w-full">
                      <Label>Manage Group Admins?</Label>
                      <p className="text-xs text-muted-foreground max-w-[95%]">Enable this option to assign or remove admin privileges for group members.</p>
                    </div>
                    <Switch
                      disabled={groupAdmins?.length === 0 || selectMoreUsers}
                      checked={changeGroupAdmins}
                      onCheckedChange={(checked) => setChangeGroupAdmins(checked)}
                      className="cursor-pointer mt-1"
                    />
                  </div>

                  {/* Admins List */}
                  {changeGroupAdmins && (
                    <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2 w-full">
                      <h3 className="text-sm font-semibold mb-2 ml-2">Manage Admins</h3>

                      {group?.groupAdmins?.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2 text-center">No admins available</p>
                      ) : (
                        group?.users.map((member) => (
                          <div key={member.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md">
                            <label className="flex items-center w-full cursor-pointer relative">
                              {/* Avatar and Info */}
                              <div className="flex items-center justify-start flex-1">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={member.image || "/images/avatar.jpg"} />
                                </Avatar>
                                <div className="font-medium text-sm ml-3">
                                  <p className="flex items-center gap-1 max-w-50 truncate overflow-hidden">
                                    <span className="max-w-25 truncate overflow-hidden">{member.name}</span>
                                    {groupAdmins?.includes(member.id) && (
                                      <span className="leading-none bg-gray-500/30 px-1 py-0.5 rounded-lg text-muted-foreground text-xs max-w-25 truncate overflow-hidden">
                                        Admin
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-muted-foreground text-xs max-w-40 truncate overflow-x-hidden">{member.email ?? ""}</p>
                                </div>
                              </div>

                              {/* Add/Remove Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(member.id, "groupAdmins", groupAdmins || []);
                                }}
                                className={clsx(
                                  "text-xs px-2 py-1 rounded-md font-medium hover:cursor-pointer",
                                  groupAdmins?.includes(member.id) ? "bg-red-600 text-white hover:bg-red-700" : "bg-slate-700 text-white hover:bg-slate-900"
                                )}>
                                {groupAdmins?.includes(member.id) ? "Remove admin" : "Make admin"}
                              </button>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle button: select more users for group */}
                <div className="flex flex-col justify-between items-center bg-transparent outline outline-gray-500/30 rounded-lg py-3 px-4">
                  {/* Header: Toggle Switch and Label */}
                  <div className="flex w-full justify-between items-start">
                    <div className="space-y-2 w-full">
                      <Label>Add More Group Members</Label>
                      <p className="text-xs text-muted-foreground max-w-[95%]">Turn this on to add more members in the group</p>
                    </div>
                    <Switch
                      disabled={friends?.length === 0 || changeGroupAdmins}
                      checked={selectMoreUsers}
                      onCheckedChange={(checked) => setSelectMoreUsers(checked)}
                      className="cursor-pointer mt-1"
                    />
                  </div>

                  {/* Friends List */}
                  {selectMoreUsers && (
                    <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2 w-full">
                      <h3 className="text-sm font-semibold mb-2 ml-2">Add more friends to group</h3>

                      {adminFriendsList.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2 text-center">No friends available</p>
                      ) : (
                        adminFriendsList.map((friend) => (
                          <div key={friend.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700/70 rounded-md">
                            <label className="flex items-center w-full cursor-pointer relative">
                              {/* Avatar and Info */}
                              <div className="flex items-center justify-start flex-1">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={friend.image || "/images/avatar.jpg"} />
                                </Avatar>
                                <div className="font-medium text-sm ml-3">
                                  <p className="max-w-50 truncate overflow-hidden">{friend.name}</p>
                                  <p className="text-muted-foreground text-xs max-w-40 truncate overflow-x-hidden">{friend.email ?? ""}</p>
                                </div>
                              </div>

                              {/* Add/Remove Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(friend.id, "users", groupUsers || []);
                                }}
                                className={clsx(
                                  "text-xs px-2 py-1 rounded-md font-medium hover:cursor-pointer",
                                  groupUsers?.includes(friend.id) ? "bg-red-600 text-white hover:bg-red-700" : "bg-slate-700 text-white hover:bg-slate-900"
                                )}>
                                {groupUsers?.includes(friend.id) ? "Remove friend" : "Add to group"}
                              </button>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action buttons (save changes and cancel)*/}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onChange();
              }}
              disabled={isSubmitting}
              className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting} className="min-w-24 cursor-pointer">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </>
  );
}

/* Generic form field component */
const ProfileField = <T extends Record<string, unknown>>({
  htmlId,
  label,
  type,
  disabled,
  register,
  errorMessage,
  rows,
}: {
  htmlId: Path<T>;
  label: string;
  type: string;
  disabled: boolean;
  register: UseFormRegister<T>;
  errorMessage: React.ReactNode;
  rows?: number;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={String(htmlId)}>{label}</Label>
      {htmlId === "bio" ? (
        <Textarea id={String(htmlId)} rows={rows ?? 2} {...register(htmlId)} disabled={disabled} />
      ) : (
        <Input id={String(htmlId)} type={type} {...register(htmlId)} disabled={disabled} />
      )}
      {errorMessage}
    </div>
  );
};
