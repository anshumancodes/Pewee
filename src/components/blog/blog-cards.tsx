import Link from "next/link";

interface BlogCardProps {
  title: string;
  dateLabel: string;
  dateIso?: string;
  author?: string;
  href: string;
  coverImg?: string | null;
  excerpt?: string;
  readTime?: number;
  tags?: string[];
  compact?: boolean;
}

export default function BlogCard({
  title,
  dateLabel,
  dateIso,
  href,
  excerpt,
  readTime,
  tags,
  compact = false,
}: BlogCardProps) {
  if (compact) {
    return (
      <Link
        href={href}
        className="group flex items-baseline justify-between gap-4 py-4 transition-colors"
      >
        <h3 className="font-sans text-sm font-medium text-neutral-300 transition-colors group-hover:text-white sm:text-base">
          {title}
        </h3>

        <time
          dateTime={dateIso}
          className="font-sans text-xs tracking-wider text-muted shrink-0"
        >
          {dateLabel}
        </time>
      </Link>
    );
  }

  return (
    <article className="group py-6 transition-colors">
      <Link href={href} className="block">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-sans text-base font-semibold tracking-tight text-neutral-200 transition-colors group-hover:text-white sm:text-lg">
            {title}
          </h2>

          <div className="flex items-center gap-3 font-sans text-xs text-muted shrink-0">
            {readTime && <span>{readTime} min read</span>}
            {readTime && dateLabel && <span aria-hidden="true">·</span>}
            {dateIso ? (
              <time dateTime={dateIso}>{dateLabel}</time>
            ) : (
              <span>{dateLabel}</span>
            )}
          </div>
        </div>

        {excerpt && (
          <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2 transition-colors group-hover:text-accent">
            {excerpt}
          </p>
        )}

        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-border/80 bg-neutral-950 px-2 py-0.5 font-sans text-[11px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}