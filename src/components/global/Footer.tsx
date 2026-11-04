import Link from "next/link";
import { siteConfig } from "@/site.config";

const socialLinks = siteConfig.socialLinks;

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border/80 py-12 text-sm">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-head text-base font-bold tracking-tight text-foreground">
            {siteConfig.name}
          </p>
          <p className="mt-1 font-sans text-xs text-muted">
            {siteConfig.tagline}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          {/* External Social Links */}
          <nav
            aria-label="Social links"
            className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-xs"
          >
            {socialLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

    
          
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-border/40 pt-6 font-sans text-[11px] text-muted">
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        {siteConfig.credit && (
          <p className="hidden sm:block">
            Built with{" "}
            <span className="underline">
              <Link href={siteConfig.credit.href}>{siteConfig.credit.label}</Link>
            </span>
          </p>
        )}
      </div>
    </footer>
  );
}
