"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/site.config";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
 
];

export const Nav = () => {
  const pathname = usePathname();

  return (
    <header className="w-full">
      <nav
        aria-label="Main Navigation"
        className="flex items-center justify-between border-b border-border/80 py-5"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <Image
            src={siteConfig.logo}
            alt=""
            width={20}
            height={20}
            priority
            className="h-5 w-5 rounded-sm object-cover"
          />
          {siteConfig.name}
        </Link>

        <ul className="flex items-center gap-6 text-xs sm:gap-8 sm:text-sm">
          {navItems.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`font-sans transition-colors ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
};

export default Nav;
