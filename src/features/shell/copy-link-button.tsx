"use client";

import { Check, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { copy } from "@/content/site";

/** Copies the current page's address. One of the few top bar controls that works today. */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing useful to do but not claim success.
    }
  }

  const label = copied ? copy.topbar.copied : copy.topbar.copyLink;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-md text-topbar-icon transition-colors hover:bg-hover"
    >
      {copied ? <Check size={20} strokeWidth={1.75} aria-hidden /> : <LinkIcon size={20} strokeWidth={1.75} aria-hidden />}
    </button>
  );
}
