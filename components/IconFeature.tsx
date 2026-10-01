import type { LucideIcon } from "lucide-react";

type IconFeatureProps =
  | { icon: LucideIcon; label?: never; title: string; text: string }
  | { icon?: never; label: string; title: string; text: string };

export function IconFeature({ icon, label, title, text }: IconFeatureProps) {
  const Icon = icon;

  return (
    <div className="group flex items-start gap-4">
      {Icon ? (
        <span className="group text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
          <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
      ) : (
        <span className="text-[1.4rem] text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
          {label}
        </span>
      )}
      <div>
        <strong className="block text-[.72rem] uppercase tracking-[.1em]">{title}</strong>
        <p className="m-[.4rem_0_0] text-[.76rem] leading-[1.5] text-muted">{text}</p>
      </div>
    </div>
  );
}
