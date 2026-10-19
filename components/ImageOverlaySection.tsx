import Image from "next/image";
import lifestyleImage from "../public/about-lifestyle.jpg";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";

type ImageOverlaySectionProps = {
  eyebrow?: string;
  headingLines: { text: string; color: "white" | "lime" }[];
  paragraphs: string[];
  emphasizedLine?: string;
  cta?: { label: string; href: string };
  compact?: boolean;
};

export function ImageOverlaySection({
  eyebrow,
  headingLines,
  paragraphs,
  emphasizedLine,
  cta,
  compact = false,
}: ImageOverlaySectionProps) {
  return (
    <section
      className={`relative overflow-hidden px-[7vw] md:px-[10vw] ${
        compact
          ? "min-h-[460px] pb-10 pt-16 md:min-h-[560px] md:pb-16 md:pt-28"
          : "min-h-[540px] py-16 md:min-h-[660px] md:py-28"
      }`}
    >
      <Image
        src={lifestyleImage}
        alt="Angler enjoying a day on the water"
        fill
        loading="lazy"
        placeholder="blur"
        blurDataURL={lifestyleImage.blurDataURL}
        sizes="100vw"
        className="z-[-2] object-cover object-[75%_center]"
      />
      <div className="absolute inset-0 z-[-1] bg-[linear-gradient(90deg,rgba(13,14,12,.94),rgba(13,14,12,.48)_60%,rgba(13,14,12,.15))]" />
      <div className="site-container relative">
        <Reveal className="relative max-w-[620px]">
          {eyebrow && (
            <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">{eyebrow}</p>
          )}
          <h2 className="my-4 text-[clamp(2.5rem,8vw,3.5rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-[1.3rem] md:text-[clamp(3rem,5vw,5.25rem)]">
            {headingLines.map((line, index) => (
              <span className={line.color === "lime" ? "text-lime" : "text-paper"} key={line.text}>
                {index > 0 && <br />}
                {line.text}
              </span>
            ))}
          </h2>
          <div className="my-6 max-w-[500px] space-y-4 text-[.9rem] leading-[1.55] text-[#d0d2c7] md:my-8 md:space-y-5 md:text-base md:leading-[1.7]">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {emphasizedLine && (
            <p className="mb-8 text-xl font-black uppercase tracking-[-.02em] text-lime md:text-2xl">
              {emphasizedLine}
            </p>
          )}
          {cta && (
            <a
              className="group link-underline inline-flex items-center gap-1.5 pb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime"
              href={cta.href}
            >
              {cta.label}{" "}
              <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none">
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              </span>
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}
