import Link from "next/link";
import dbConnect from "@/db/dbconnect";
import { BlogModel } from "@/schemas/blog.schema";
import { PUBLISHED_FILTER } from "@/lib/blog";
import { cmsHref } from "@/site.config";

// No ISR — always fresh stats
export const dynamic = "force-dynamic";

interface Stats {
  total: number;
  published: number;
  archived: number;
  deleted: number;
  latest: { title: string; slug: string; createdAt: string }[];
}

async function getBlogStats(): Promise<Stats> {
  await dbConnect();

  const [total, published, archived, deleted, latestDocs] = await Promise.all([
    BlogModel.countDocuments({}),
    BlogModel.countDocuments(PUBLISHED_FILTER),
    BlogModel.countDocuments({ archived: true, deletedBy: { $exists: false } }),
    BlogModel.countDocuments({ deletedBy: { $exists: true } }),
    BlogModel.find(PUBLISHED_FILTER)
      .select("title slug createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean<{ title: string; slug: string; createdAt?: Date }[]>(),
  ]);

  return {
    total,
    published,
    archived,
    deleted,
    latest: latestDocs.map((b) => ({
      title: b.title,
      slug: b.slug,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : "",
    })),
  };
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const stats = await getBlogStats();

  const statCards = [
    { label: "Total Posts", value: stats.total },
    { label: "Published", value: stats.published },
    { label: "Archived", value: stats.archived },
    { label: "Deleted", value: stats.deleted },
  ];

  return (
    <div>
      {/* Page heading */}
      <div className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
          Overview
        </p>
        <h1 className="text-3xl font-normal tracking-tight text-foreground">
          Dashboard
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border mb-12">
        {statCards.map(({ label, value }) => (
          <div
            key={label}
            className="bg-surface px-5 py-5 transition-colors hover:bg-background"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
              {label}
            </p>
            <p className="text-4xl font-normal text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <hr className="border-none h-px bg-border mb-10" />

      {/* Latest posts */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Recent Posts
          </p>
          <Link
            href={cmsHref("/manage-blog")}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-accent transition-colors"
          >
            Manage all →
          </Link>
        </div>

        {stats.latest.length === 0 ? (
          <p className="text-sm text-muted">No posts yet.</p>
        ) : (
          <div className="border border-border divide-y divide-border">
            {stats.latest.map((post) => (
              <div
                key={post.slug}
                className="flex items-center justify-between gap-4 bg-surface px-4 py-3 hover:bg-background transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {post.title}
                  </p>
                  <p className="font-mono text-[10px] text-muted mt-0.5 truncate">
                    /blog/{post.slug}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <time
                    dateTime={post.createdAt}
                    className="font-mono text-[10px] text-muted whitespace-nowrap"
                  >
                    {formatDate(post.createdAt)}
                  </time>
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="font-mono text-[11px] text-muted hover:text-accent transition-colors"
                    title="View post"
                  >
                    ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-12 pt-8 border-t border-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-4">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={cmsHref("/manage-blog")}
            className="border border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:border-accent hover:text-accent transition-colors"
          >
            Manage blogs
          </Link>
          <Link
            href="/blog"
            target="_blank"
            className="border border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:border-accent hover:text-accent transition-colors"
          >
            View public blog ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
