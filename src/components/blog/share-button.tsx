"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";

export function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard access
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label={copied ? "Link copied!" : "Copy link to share"}
      title={copied ? "Link copied!" : "Copy link"}
      className="inline-flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-foreground"
    >
      {copied ? (
        <>
          <Check size={16} className="text-green-400" />
          <span className="text-xs text-green-400">Copied!</span>
        </>
      ) : (
        <Share2 size={18} />
      )}
    </button>
  );
}
