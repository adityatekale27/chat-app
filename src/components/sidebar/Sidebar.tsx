"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import clsx from "clsx";
import { useParams, usePathname, useRouter } from "next/navigation";
import { LogOut, Search, UserPlus } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import ToolTip from "../others/Tooltip";
import ThemeToggle from "../others/ToggleTheme";
import useUserRoutes from "@/hooks/useUserRoutes";
import { useAuth } from "@/hooks/useAuth";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import LoadingScreen from "../loading-states/LoadingScreen";
import { Button } from "../ui/button";

interface SidebarProps {
  children: React.ReactNode;
  currentUser: User;
}

// Lazy loading components
const ChatSidebar = lazy(() => import("@/components/sidebar/ChatSidebar"));
const ContactSidebar = lazy(() => import("@/components/sidebar/ContactSidebar"));
const CallsSidebar = lazy(() => import("@/components/sidebar/CallsSidebar"));
const FindFriend = lazy(() => import("@/components/dialogs/FindFriend"));
const CreateGroup = lazy(() => import("@/components/dialogs/CreateGroup"));
const CurrentUserProfile = lazy(() => import("@/components/user-profile/CurrentUserProfile"));

function SidebarComponent({ children, currentUser }: SidebarProps & React.ComponentProps<typeof Sidebar>) {
  const { receivedRequests } = useFriendRequests(currentUser.id);
  const { logout } = useAuth();
  const { conversationId } = useParams();
  const isMobile = useIsMobile();
  const router = useRouter();
  const routes = useUserRoutes();
  const pathname = usePathname();

  const [showRequestNumbers, setShowRequestNumbers] = useState(false);
  const [openFindFriend, setOpenFindFriend] = useState(false);
  const [openCreateGroup, setOpenCreateGroup] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce the serach term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Show friend request numbers (notificaiton) when received requests length changes
  useEffect(() => {
    setShowRequestNumbers(receivedRequests.length > 0);
  }, [receivedRequests.length]);

  // Handler to open conversation with friend
  const handleSidebarRoutesClick = useCallback(
    (item: { title: string; url: string }) => {
      if (item.title === "Logout") {
        logout();
      } else if (item.title === "Find Friends") {
        setOpenFindFriend(true);
      } else {
        router.push(item.url);
      }
    },
    [logout, router]
  );

  return (
    <Suspense fallback={<LoadingScreen />}>
      <SidebarProvider style={{ "--sidebar-width": "350px" } as React.CSSProperties}>
        <div className="flex h-dvh w-full">
          <div className={clsx(isMobile && conversationId ? "hidden" : "flex", isMobile ? "flex-col-reverse w-full" : "flex-row")}>
            {/* First sidebar (bottom sidebar for mobile) */}
            <Sidebar collapsible="none" className={clsx("dark:bg-black bg-[#979dac]", isMobile ? "w-full h-16" : "p-1.5 !w-[calc(var(--sidebar-width-icon)_+_10px)]")}>
              <div
                className={clsx(`dark:bg-[#212121] bg-[#fffbfe] h-full justify-center items-center`, isMobile ? "flex border-t border-gray-500/50" : "flex flex-col rounded-lg")}>
                {/* Show user profile image only on desktop */}
                {!isMobile && (
                  <SidebarFooter className="mt-1">
                    <CurrentUserProfile />
                  </SidebarFooter>
                )}

                {/* Routes (chat, contact, find friends, logout) */}
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu className={clsx(isMobile && "flex justify-around items-center flex-row")}>
                        {routes.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            {/* Find friend dialog box and friend requests notification */}
                            {item.title === "Find Friends" && (
                              <>
                                {showRequestNumbers && receivedRequests.length && (
                                  <span className="p-0.5 px-1.5 text-xs font-semibold leading-none text-white bg-green-600/70 rounded-full absolute top-1 right-0">
                                    {receivedRequests.length}
                                  </span>
                                )}
                              </>
                            )}

                            <div className="flex flex-col items-center justify-around">
                              <SidebarMenuButton
                                tooltip={{ children: item.title, hidden: false }}
                                onClick={() => handleSidebarRoutesClick(item)}
                                isActive={item.isActive}
                                className="px-3 h-10 w-10 dark:text-slate-50 text-slate-900 hover:cursor-pointer">
                                <item.icon />
                              </SidebarMenuButton>
                              <span className="block text-xs md:hidden dark:text-gray-300 text-black">{item.title}</span>
                            </div>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>

                {/* Show theme toggle and logout button only on desktop */}
                {!isMobile && (
                  <>
                    <div className={`mb-2`}>
                      <ThemeToggle />
                    </div>
                    <Button
                      onClick={() => logout()}
                      className="w-9.5 bg-transparent border text-black dark:text-white mb-3 hover:cursor-pointer hover:bg-red-700 hover:text-white dark:hover:bg-red-700/50">
                      <LogOut />
                    </Button>
                  </>
                )}
              </div>
            </Sidebar>

            {/* Second sidebar */}
            <Sidebar collapsible="none" className={clsx(`dark:bg-black bg-[#979dac]`, isMobile ? "w-full" : "p-1.5 flex-1")}>
              <div className="dark:bg-[#212121] dark:text-slate-100 bg-[#fffbfe] min-h-full max-h-[calc(100vh-140px)] md:rounded-lg">
                <SidebarHeader className="max-h-15 border-b border-gray-500/50 p-3 flex flex-row-reverse items-center gap-1">
                  {/* Show user profile image only on mobile */}
                  {isMobile && (
                    <SidebarFooter>
                      <CurrentUserProfile />
                    </SidebarFooter>
                  )}

                  {/* Search box and Create group button */}
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-50" size={20} />
                    <SidebarInput
                      placeholder="Type to search..."
                      className="w-full rounded-full bg-gray-200 dark:bg-[#171717] p-4 pl-10 pr-11 outline-none border border-gray-500/50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <ToolTip content="Create Group">
                      <UserPlus
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-50 cursor-pointer"
                        size={20}
                        onClick={() => setOpenCreateGroup(true)}
                      />
                    </ToolTip>
                  </div>
                </SidebarHeader>

                {/* Display ChatSidebar or ContactSidebar based on pathname */}
                <SidebarContent className="pb-5 max-h-[calc(100vh-155px)] md:max-h-[calc(100vh-56px)]">
                  <SidebarGroup className="px-2 overflow-y-auto">
                    <SidebarGroupContent>
                      {pathname === "/contact" ? (
                        <ContactSidebar currentUser={currentUser} searchTerm={debouncedSearchTerm} />
                      ) : pathname === "/calls" ? (
                        <CallsSidebar currentUser={currentUser} />
                      ) : (
                        <ChatSidebar currentUser={currentUser} searchTerm={debouncedSearchTerm} />
                      )}
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </div>

              {openFindFriend && <FindFriend isOpen={openFindFriend} trigger={openFindFriend} onClose={() => setOpenFindFriend(false)} currentUser={currentUser} />}
              {openCreateGroup && <CreateGroup isOpen={openCreateGroup} onClose={() => setOpenCreateGroup(false)} currentUser={currentUser} />}
            </Sidebar>
          </div>

          {/* Main content area (display conversation or empty state) */}
          {(!isMobile || (isMobile && conversationId)) && (
            <SidebarInset className={`dark:bg-black bg-[#979dac] h-screen md:p-1.5`}>
              <div className={`dark:bg-[#212121] dark:text-slate-50 bg-[#fffbfe] text-black h-full md:rounded-lg`}>
                <main className="overflow-hidden h-full max-h-dvh flex flex-col">{children}</main>
              </div>
            </SidebarInset>
          )}
        </div>
      </SidebarProvider>
    </Suspense>
  );
}

export default SidebarComponent;
