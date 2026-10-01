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
          ? "group flex flex-col items-center gap-1.5 text-center"
          : "group flex items-start gap-3 md:gap-4"
      }
    >
      {Icon ? (
        <span className="text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
          <Icon
            className={compact ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5 md:h-6 md:w-6"}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </span>
      ) : (
        <span className="text-[1.1rem] text-lime transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 motion-reduce:transform-none motion-reduce:transition-none">
          {label}
        </span>
      )}
      <div>
        <strong
          className={
            compact
              ? "block text-[.58rem] leading-tight uppercase tracking-[.08em] md:text-[.62rem]"
              : "block text-[.68rem] uppercase tracking-[.08em] md:text-[.72rem]"
          }
        >
          {title}
        </strong>
        {text && (
          <p
            className={
              compact
                ? "m-[.2rem_0_0] text-[.54rem] leading-[1.25] text-muted md:text-[.58rem]"
                : "m-[.3rem_0_0] text-[.72rem] leading-[1.45] text-muted md:text-[.76rem]"
            }
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
