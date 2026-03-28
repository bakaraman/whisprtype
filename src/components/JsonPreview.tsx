interface JsonPreviewProps {
  title: string;
  value: unknown;
}

export function JsonPreview({ title, value }: JsonPreviewProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Config preview</p>
          <h3>{title}</h3>
        </div>
      </div>
      <pre className="json-preview">{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
