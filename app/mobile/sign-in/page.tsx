import { NativeSignIn } from "@/components/native-sign-in";
import { validChallenge } from "@/lib/mobile-auth";

export default async function NativeSignInPage({ searchParams }: { searchParams: Promise<{ challenge?: string }> }) {
  const { challenge } = await searchParams;
  return <main className="signin-shell"><section className="login-card">
    <h1>Sign in to Loccal</h1>
    {validChallenge(challenge) ? <NativeSignIn challenge={challenge} /> : <p>Return to the Loccal app to start sign-in again.</p>}
  </section></main>;
}
