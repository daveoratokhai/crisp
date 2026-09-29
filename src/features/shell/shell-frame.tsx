"use client";

import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { copy } from "@/content/site";

const SidebarContext = createContext<{ close: () => void }>({ close: () => {} });

/** The sidebar's own "close sidebar" button, top left. */
export function useSidebar() {
  return useContext(SidebarContext);
}

/**
 * Desktop: the sidebar is a 270px column that can be collapsed. Phone: it is
 * a drawer behind a menu button, because 270px leaves no room for the page at
 * 375px. The drawer is open only while still on the page it was opened on,
 * so navigating closes it with no effect needed.
 *
 * While the sidebar is hidden, a floating button at the top left brings it
 * back; pages leave room for it (`pt-14` on a phone or when collapsed).
 */
export function ShellFrame({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const drawerOpen = openedOn === pathname;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const close = () => {
    if (window.matchMedia("(min-width: 768px)").matches) setCollapsed(true);
    else setOpenedOn(null);
  };
  const open = () => {
    setCollapsed(false);
    setOpenedOn(pathname);
  };

  return (
    <SidebarContext.Provider value={{ close }}>
      <div className="group/shell flex h-dvh bg-bg" data-collapsed={collapsed}>
        <aside
          id="sidebar"
          className={`fixed inset-y-0 left-0 z-30 w-[270px] shrink-0 transition-transform md:static md:z-auto md:translate-x-0 ${
            drawerOpen ? "translate-x-0 shadow-menu" : "-translate-x-full"
          } ${collapsed ? "md:hidden" : ""}`}
        >
          {sidebar}
        </aside>

        {drawerOpen && <div aria-hidden onClick={() => setOpenedOn(null)} className="fixed inset-0 z-20 bg-black/40 md:hidden" />}

        <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          <button
            type="button"
            onClick={open}
            aria-controls="sidebar"
            // Only visible while the sidebar is hidden (phone drawer shut, or
            // collapsed on desktop), so the drawer state is the whole answer.
            aria-expanded={drawerOpen}
            aria-label={copy.sidebar.open}
            title={copy.sidebar.open}
            // z-15: above page content (sticky parts use z-10); below the
            // drawer overlay (z-20) and drawer (z-30).
            className={`fixed left-3 top-3 z-[15] size-9 place-items-center rounded-full border border-line bg-surface text-topbar-icon shadow-card hover:bg-hover ${
              collapsed ? "grid" : "grid md:hidden"
            }`}
          >
            <PanelLeft size={18} strokeWidth={1.75} aria-hidden />
          </button>
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
