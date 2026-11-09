import { AppHeader } from "@/features/layout/components/app-header";
import { AppSidebar } from "@/features/layout/components/app-sidebar";
import { SidebarProvider } from "@/features/layout/sidebar-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* h-dvh, not h-screen: on phones 100vh is taller than the visible area, hiding content under the browser bar. */}
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden bg-background">
          <AppHeader />
          <main className="flex-1 overflow-auto px-3 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
