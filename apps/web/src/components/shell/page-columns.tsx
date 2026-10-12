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
      {/* Flush with the rail, which draws the left hairline; without an aside the column fills the frame. */}
      <div className="min-h-svh min-w-0 flex-1 md:border-r">
        {header ? (
          // top-14 clears the mobile bar; the rail replaces it from md up.
          <header className="bg-background/80 sticky top-14 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-5 md:top-0">
            {header}
          </header>
        ) : null}
        {children}
      </div>
      {aside ? (
        <aside
          aria-label="Highlights"
          className="hidden w-[332px] shrink-0 border-r xl:block"
        >
          <div className="sticky top-0 flex max-h-svh scrollbar-none flex-col gap-4 overflow-y-auto px-5 py-5">
            {aside}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
