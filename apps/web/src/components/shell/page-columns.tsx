import type { ReactNode } from "react";

export function PageColumns({
  header,
  aside,
  children,
}: {
  header?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0">
      {/* Without an aside the column fills the frame. */}
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        {header ? (
          // top-14 clears the mobile bar; the rail replaces it from md up.
          <header className="glass-chrome sticky top-14 z-10 flex h-14 items-center gap-3 px-4 sm:px-5 md:top-0">
            {header}
          </header>
        ) : null}
        <div className="page-sheet flex-1">{children}</div>
      </div>
      {aside ? (
        <aside
          aria-label="Highlights"
          className="campus-clear hidden w-[332px] shrink-0 xl:block"
        >
          <div className="sticky top-0 flex max-h-svh scrollbar-none flex-col gap-4 overflow-y-auto px-5 py-5">
            {aside}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
