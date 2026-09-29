"use client";

import { SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createPage } from "@/app/actions";
import { copy } from "@/content/site";
import { docHref } from "@/features/workspace/links";

/** Creates a local, unpublished page and opens it. Used by every "new page" control. */
export function useCreatePage() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const create = () =>
    start(async () => {
      const id = await createPage();
      router.push(docHref(id));
    });
  return { create, pending };
}

/**
 * A button that creates a page. Styling comes from the caller.
 *
 * `writable` defaults to true, since most callers run where Crisp always has
 * a disk to write to; pages that can be deployed to a read-only host (see
 * src/lib/deploy.ts) pass it through explicitly. When false, the button
 * keeps its look but never calls the server, and says why on hover, the same
 * pattern as `notBuilt` for features that are not built yet.
 */
export function NewPageButton({
  className,
  children,
  label,
  writable = true,
}: {
  className: string;
  children: React.ReactNode;
  label?: string;
  writable?: boolean;
}) {
  const { create, pending } = useCreatePage();
  return (
    <button
      type="button"
      onClick={writable ? create : undefined}
      disabled={writable && pending}
      aria-disabled={!writable || undefined}
      aria-label={label}
      title={writable ? label : copy.topbar.readOnlyHost}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * The sidebar's 28px new-page icon button. It imports its own icon: the
 * sidebar renders on the server, and a component (a function) cannot be
 * passed as a prop from a server component to a client one.
 */
export function NewPageIcon({ label, writable = true }: { label: string; writable?: boolean }) {
  return (
    <NewPageButton
      label={label}
      writable={writable}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-icon transition-colors hover:bg-hover disabled:opacity-50 aria-disabled:opacity-50"
    >
      <SquarePen size={20} strokeWidth={1.75} aria-hidden />
    </NewPageButton>
  );
}
