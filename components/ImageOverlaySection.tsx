import Image from "next/image";

type ImageOverlaySectionProps = {
  eyebrow?: string;
  headingLines: { text: string; color: "white" | "lime" }[];
  paragraphs: string[];
  emphasizedLine?: string;
  cta?: { label: string; href: string };
};

export function ImageOverlaySection({
  eyebrow,
  headingLines,
  paragraphs,
  emphasizedLine,
  cta,
}: ImageOverlaySectionProps) {
  return (
    <section className="relative min-h-[620px] overflow-hidden px-[7vw] py-20 md:min-h-[720px] md:px-[10vw] md:py-32">
      <Image
        src="/about-lifestyle.jpg"
        alt="Angler enjoying a day on the water"
        fill
        sizes="100vw"
        className="z-[-2] object-cover object-[75%_center]"
      />
      <div className="absolute inset-0 z-[-1] bg-[linear-gradient(90deg,rgba(13,14,12,.94),rgba(13,14,12,.48)_60%,rgba(13,14,12,.15))]" />
      <div className="relative max-w-[620px]">
        {eyebrow && (
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">{eyebrow}</p>
        )}
        <h2 className="my-[1.3rem] text-[3.5rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(3rem,6vw,6rem)]">
          {headingLines.map((line, index) => (
            <span
              className={line.color === "lime" ? "text-lime" : "text-paper"}
              key={line.text}
            >
              {index > 0 && <br />}
              {line.text}
            </span>
          ))}
        </h2>
        <div className="my-8 max-w-[500px] space-y-5 leading-[1.7] text-[#d0d2c7]">
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
            className="border-b border-lime pb-1 text-[.7rem] font-extrabold uppercase tracking-[.12em] text-lime"
            href={cta.href}
          >
            {cta.label} ↗
          </a>
        )}
      </div>
    </section>
  );
}