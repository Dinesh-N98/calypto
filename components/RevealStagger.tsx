"use client";

import { Children, type ReactNode } from "react";
import { Reveal } from "./Reveal";

type RevealStaggerProps = {
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right" | "none";
};

export function RevealStagger({ children, className = "", direction = "up" }: RevealStaggerProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <Reveal delay={Math.min(index * 100, 400)} direction={direction}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
