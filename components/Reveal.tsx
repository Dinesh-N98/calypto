import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  as?: "div" | "section" | "li" | "article";
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
};

export function Reveal({
  children,
  as = "div",
  delay = 0,
  direction = "up",
  className = "",
}: RevealProps) {
  const animation = direction === "none" ? "fade" : `fade-${direction}`;
  const Element = as;
  return (
    <Element className={className} data-aos={animation} data-aos-delay={delay} data-aos-once="true">
      {children}
    </Element>
  );
}
