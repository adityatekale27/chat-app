import getCurrentUser from "@/actions/getCurrentUser";
import Sidebar from "@/components/sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function ContactLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  return (
    <SidebarProvider>
      {currentUser && (
        <Sidebar currentUser={currentUser}>
          <div className="h-full">{children}</div>
        </Sidebar>
      )}
    </SidebarProvider>
  );
}
