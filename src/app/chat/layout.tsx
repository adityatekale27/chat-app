import getCurrentUser from "@/actions/getCurrentUser";
import PresenceManager from "@/components/others/PresenceManager";
import Sidebar from "@/components/sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PresenceProvider } from "@/contexts/PresenceContext";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  return (
    <PresenceProvider>
      <SidebarProvider>
        {currentUser && (
          <>
            <Sidebar currentUser={currentUser}>
              <div className="h-full">{children}</div>
            </Sidebar>

            <PresenceManager currentUser={currentUser} />
          </>
        )}
      </SidebarProvider>
    </PresenceProvider>
  );
}
