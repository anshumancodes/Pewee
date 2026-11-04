"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { siteConfig, cmsHref } from "@/site.config";

const NAV_LINKS = [
  { href: cmsHref(), label: "Overview", icon: "⬡" },
  { href: cmsHref("/manage-blog"), label: "Manage blogs", icon: "◈" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin", { method: "DELETE" });
    router.push("/auth");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-full w-56 border-r border-border flex flex-col z-20"
        style={{ background: "var(--surface)" }}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-border">
          <Link
            href="/"
            className=" text-8 tracking-[0.18em]  hover:opacity-75 transition-opacity"
          >
            {siteConfig.name}
          </Link>
          <p className="text-6 tracking-[0.15em] text-muted mt-1">
            Dashboard
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active =
              href === cmsHref()
                ? pathname === cmsHref()
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  active
                    ? "bg-background text-accent border-l-2 border-accent pl-[10px]"
                    : "text-muted hover:text-foreground hover:bg-background border-l-2 border-transparent pl-[10px]"
                }`}
              >
                <span className="text-[27px] shrink-0">{icon}</span>
                <span className="font-mono text-[14px] font-bold tracking-[0.1em]">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / Sign out */}
        <div className="px-6 py-5 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-red-400 transition-colors"
          >
            ← Sign out
          </button>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="flex-1  min-h-screen px-6 py-8">
        {children}
      </main>
    </div>
  );
}
