import type { ReactNode } from "react";

interface SectionToolbarProps {
  title: string;
  titleId?: string;
  children?: ReactNode;
}

export function SectionToolbar({ title, titleId, children }: SectionToolbarProps) {
  return (
    <div className="section-toolbar">
      <h2 id={titleId}>{title}</h2>
      {children ? <div className="section-toolbar-actions">{children}</div> : null}
    </div>
  );
}
