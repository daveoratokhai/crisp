import { copy } from "@/content/site";
import type { DocState } from "@/features/workspace/doc";

const STYLE: Record<DocState | "fromTeam", string> = {
  local: "bg-hover text-text-2",
  published: "bg-success-bg text-success",
  changed: "bg-warning-bg text-warning",
  fromTeam: "bg-accent-soft text-link",
};

/**
 * A document's publish state as a pill. "From the team" wins over
 * "Published": it tells you there is no copy of this page on your machine.
 * The label always carries the meaning; colour only reinforces it.
 */
export function StatusBadge({ state, fromTeam = false }: { state: DocState; fromTeam?: boolean }) {
  const key = fromTeam ? "fromTeam" : state;
  return (
    <span className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium ${STYLE[key]}`}>
      {copy.status[key]}
    </span>
  );
}
