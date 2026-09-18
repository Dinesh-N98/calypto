import { SignInForm } from "@/components/SignInForm";

export default function SignInPage() {
  return (
    <main className="bg-ink px-[7vw] py-20 text-paper md:px-[10vw] md:py-28">
      <section className="mx-auto max-w-5xl">
        <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-lime">Your Calypto account</p>
        <h1 className="my-5 max-w-3xl text-[4rem] font-black uppercase leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8vw,8rem)]">
          Welcome<br /><em className="text-lime not-italic">back.</em>
        </h1>
        <SignInForm />
      </section>
    </main>
  );
}