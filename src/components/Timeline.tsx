import type { TranscriptEntry } from "../types/app";

interface TimelineProps {
  items: TranscriptEntry[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="timeline">
      {items.map((item) => (
        <article className="timeline__item" key={item.id}>
          <div className="timeline__dot" />
          <div className="timeline__content">
            <div className="timeline__meta">
              <strong>{item.title}</strong>
              <span>{item.createdAt}</span>
            </div>
            <p>{item.preview}</p>
            <code>{item.sourcePath}</code>
          </div>
        </article>
      ))}
    </div>
  );
}
