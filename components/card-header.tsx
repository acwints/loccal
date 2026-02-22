interface CardHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function CardHeader({ eyebrow, title, description }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {description ? <p className="settings-help">{description}</p> : null}
    </div>
  );
}
