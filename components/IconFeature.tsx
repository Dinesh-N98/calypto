export function IconFeature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="group flex items-start gap-4">
      <span className="text-[1.4rem] text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
        {icon}
      </span>
      <div>
        <strong className="block text-[.72rem] uppercase tracking-[.1em]">{title}</strong>
        <p className="m-[.4rem_0_0] text-[.76rem] leading-[1.5] text-muted">{text}</p>
      </div>
    </div>
  );
}
