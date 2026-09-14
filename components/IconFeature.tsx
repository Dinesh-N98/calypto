export function IconFeature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="icon-feature">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
