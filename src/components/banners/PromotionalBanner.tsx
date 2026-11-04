"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { Announcement } from "@/site.config";

// Configure (or disable) this banner via `announcement` in src/site.config.ts
export default function PromotionalBanner({
  announcement,
}: {
  announcement: Announcement;
}) {
  const [visible, setVisible] = useState(true);

  function dismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label={`${announcement.lead} ${announcement.linkText}`}
      className="w-full border-b border-border/60 bg-surface/80 backdrop-blur-sm"
      style={{ animation: "bannerSlideDown 0.35s ease both" }}
    >
      <style>{`
        @keyframes bannerSlideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-5 py-2.5 sm:px-8">
        {/* Left — label pill */}
       

        {/* Centre — message */}
        <p className="flex-1 text-center font-sans text-[12px] leading-snug text-accent sm:text-[13px]">
          <span className="text-foreground font-medium">{announcement.lead}</span>{" "}
          <Link
            href={announcement.href}
            className="font-semibold text-foreground underline underline-offset-1 decoration-border hover:decoration-foreground transition-[text-decoration-color] duration-150"
            onClick={dismiss}
          >
            <span>
               {announcement.linkText}
            </span>
          </Link>
        </p>

        {/* Right — dismiss */}
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border"
        >
          <X size={16}/>
        </button>
      </div>
    </div>
  );
}
