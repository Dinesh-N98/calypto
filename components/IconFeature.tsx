import type { LucideIcon } from "lucide-react";

type IconFeatureProps =
  | { icon: LucideIcon; label?: never; title: string; text?: string; compact?: boolean }
  | { icon?: never; label: string; title: string; text: string; compact?: never };

export function IconFeature({ icon, label, title, text, compact = false }: IconFeatureProps) {
  const Icon = icon;

  return (
    <div
      className={
        compact
          ? "group flex flex-col items-center gap-2 text-center"
          : "group flex items-start gap-4"
      }
    >
      {Icon ? (
        <span className="text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.5} aria-hidden="true" />
        </span>
      ) : (
        <span className="text-[1.4rem] text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
          {label}
        </span>
      )}
      <div>
        <strong
          className={
            compact
              ? "block text-[.62rem] leading-tight uppercase tracking-[.1em]"
              : "block text-[.72rem] uppercase tracking-[.1em]"
          }
        >
          {title}
        </strong>
        {text && (
          <p
            className={
              compact
                ? "m-[.3rem_0_0] text-[.58rem] leading-[1.3] text-muted"
                : "m-[.4rem_0_0] text-[.76rem] leading-[1.5] text-muted"
            }
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
