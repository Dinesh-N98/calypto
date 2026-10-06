import { SignUpForm } from "@/components/SignUpForm";
import { Reveal } from "@/components/Reveal";

export default function SignUpPage() {
  return (
    <main className="bg-ink px-[7vw] py-14 text-paper md:px-[10vw] md:py-24">
      <Reveal as="section" className="mx-auto max-w-5xl">
        <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">Join Calypto</p>
        <h1 className="my-4 max-w-3xl text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
          Keep your
          <br />
          <em className="text-lime not-italic">edge.</em>
        </h1>
        <SignUpForm />
      </Reveal>
    </main>
  );
}
