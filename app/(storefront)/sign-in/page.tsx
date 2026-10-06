import { SignInForm } from "@/components/SignInForm";
import { Reveal } from "@/components/Reveal";
import { getValidatedAdminReturnPath } from "@/lib/admin-return-path";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = getValidatedAdminReturnPath(params.callbackUrl, "/account");

  return (
    <main className="bg-ink px-[7vw] py-14 text-paper md:px-[10vw] md:py-24">
      <Reveal as="section" className="mx-auto max-w-5xl">
        <p className="text-[.6rem] font-bold uppercase tracking-[.15em] text-lime">
          Your Calypto account
        </p>
        <h1 className="my-4 max-w-3xl text-[clamp(2.65rem,9vw,3.8rem)] font-black uppercase leading-[.92] tracking-[-.07em] md:my-5 md:text-[clamp(3.5rem,6vw,6rem)]">
          Welcome
          <br />
          <em className="text-lime not-italic">back.</em>
        </h1>
        <SignInForm callbackUrl={callbackUrl} />
      </Reveal>
    </main>
  );
}
