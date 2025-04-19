"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CalendarDays, Captions, Mail, UserPen, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import ThemeToggle from "../others/ToggleTheme";
import { DialogBox } from "../dialogs/DialogBox";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { EditProfile } from "./EditProfile";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useSession } from "next-auth/react";

const CurrentUserProfileComponent = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const { friends } = useFriendRequests(user?.id ?? "");

  const [loading, setLoading] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [deleteConfimation, setDeleteConfirmation] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  /* Memoized: get user's joining date */
  const userJoinDate = useMemo(() => format(new Date(user?.createdAt || new Date()), "PP"), [user?.createdAt]);

  /* Memoized: get all friends of current user */
  const friendsList = useMemo(() => {
    if (!user || !friends.length) return [];
    return friends.map((friend) => (friend.sender.id === user.id ? friend.receiver : friend.sender));
  }, [friends, user]);

  /* Memoized: display at most 4 frineds (show all with button) */
  const displayedFriends = useMemo(() => {
    return friendsList.slice(0, 4);
  }, [friendsList]);

  /* Handles the deletion of the current user's account */
  const handleAccountDelete = useCallback(async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/users/me`, { data: { userId: user?.id } });
      router.push("/register");
      window.location.href = "/";
      toast.success("Account deleted successfully!");
    } catch (error) {
      console.log("handleAccountDelte error:", error);
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
    }
  }, [router, user?.id]);

  return (
    <>
      {/* Profile Trigger */}
      <Avatar className="h-9 w-9 md:h-10 md:w-10 rounded-full md:rounded-lg cursor-pointer border-2 border-transparent" onClick={() => setIsOpen(true)}>
        <AvatarImage src={user?.image || "/images/avatar.jpg"} alt={user?.name || "Profile"} />
      </Avatar>

      <DialogBox isOpen={isOpen} onClose={() => setIsOpen(false)} trigger={isOpen} dialogTitle="" dialogDescription="">
        <Tabs defaultValue="account" className="w-full">
          {/* Dialog tabs (account and settings) */}
          {!editProfile && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account" className="cursor-pointer">
                Account
              </TabsTrigger>
              <TabsTrigger value="settings" className="cursor-pointer">
                Settings
              </TabsTrigger>
            </TabsList>
          )}

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              {editProfile ? (
                <>
                  {/* Show edit profile dialog box (if edit profile is true) */}
                  <EditProfile mode="user" user={user} open={editProfile} onChange={() => setEditProfile(false)} />
                </>
              ) : (
                <>
                  {/* Display users profile info (name, bio, email, friends, joined date) */}
                  <div className="p-3 md:p-6 space-y-6">
                    {/* Profile Header: name, image, username */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-18 w-18 rounded-full ">
                        <Image src={user?.image || "/images/avatar.jpg"} alt={user?.name || "Profile"} fill className="rounded-full object-cover" priority />
                      </div>
                      <div className="text-center">
                        <h1 className="text-xl font-semibold">{user?.name || "User"}</h1>
                        {user?.username && <p className="text-muted-foreground">@{user.username}</p>}
                      </div>
                    </div>

                    {/* Profile Details: bio, email, joined date and friends list */}
                    <div className="space-y-4">
                      {user?.bio ? (
                        <ProfileField icon={<Captions className="h-5 w-5" />} label="Bio" value={user?.bio || "No bio available"} />
                      ) : (
                        <div className="p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg text-center text-muted-foreground">No bio available</div>
                      )}

                      <ProfileField icon={<Mail className="h-5 w-5" />} label="Email" value={user?.email || ""} />
                      <ProfileField icon={<CalendarDays className="h-5 w-5" />} label="Joined" value={userJoinDate} />

                      {/* Friends list */}
                      <div className="p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg space-y-2 ">
                        {friendsList.length > 0 ? (
                          <>
                            <div className="flex items-center gap-4">
                              <Users className="h-5 w-5 text-muted-foreground" />
                              <h3 className="text-sm font-medium text-muted-foreground">{friendsList.length} Friends</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-1 mt-3">
                              {displayedFriends.map((friend) => (
                                <div
                                  key={friend.id}
                                  className="flex overflow-x-hidden item-center justify-start gap-3 px-3 py-2 rounded-lg bg-gray-300/30 dark:bg-[#212121] border border-gray-400/10">
                                  <div className="relative shrink-0 h-8 w-8">
                                    <Image src={friend.image || "/images/avatar.jpg"} alt={friend.name || "Member"} fill className="rounded-full" />
                                  </div>
                                  <div>
                                    <p className="pt-1 font-medium truncate max-w-[100px] md:max-w-[120px] whitespace-nowrap">{friend.name}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {friendsList.length > 4 && (
                              <Button
                                variant="ghost"
                                className="w-full cursor-pointer hover:border"
                                onClick={() => {
                                  router.push("/contact");
                                  setIsOpen(false);
                                }}>
                                View all friends
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="rounded-lg text-center text-muted-foreground">No friends available</div>
                        )}
                      </div>

                      {/* Edit profile button */}
                      <Button className="w-full gap-2 mt-3 cursor-pointer" onClick={() => setEditProfile(true)}>
                        <UserPen className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <div className="p-6 space-y-6">
                {/* Appearance Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Appearance</h2>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/90 border dark:border-none">
                    <div className="space-y-1">
                      <p className="font-medium">Theme</p>
                      <p className="text-sm text-muted-foreground">Customize your interface appearance</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10">
                    <div className="space-y-1">
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently remove your account and all associated data</p>
                      <Button variant="destructive" className="w-full mt-2 cursor-pointer bg-red-500 dark:hover:bg-red-800/80" onClick={() => setDeleteConfirmation(true)}>
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogBox>

      {/* Confirmation dialog for deleting user account */}
      <ConfirmationDialog
        open={deleteConfimation}
        loading={loading}
        onOpenChange={setDeleteConfirmation}
        title="Confirm Account Deletion"
        description="This action cannot be undone. All your data will be permanently removed."
        onConfirm={handleAccountDelete}
      />
    </>
  );
};

/* Generic profile field component */
const ProfileField = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = value.length > 100;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-[#F5F5F6] dark:bg-muted/50">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
        <div className="space-y-1">
          <p className={`${canExpand && !expanded ? "line-clamp-2" : ""}`}>{value}</p>
          {canExpand && (
            <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const CurrentUserProfile = React.memo(CurrentUserProfileComponent);
