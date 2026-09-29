/** Notion's letter badge for teamspaces and workspaces: 20px, 3px radius. */
export function Badge({ letter }: { letter: string }) {
  return (
    <span
      aria-hidden
      className="grid size-5 shrink-0 place-items-center rounded-[3px] bg-line text-[13.75px] font-medium leading-none text-muted"
    >
      {letter}
    </span>
  );
}
