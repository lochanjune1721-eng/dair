import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="marginalia opacity-60">NOT ON THE RECORD</p>
      <h1 className="mt-4 font-display text-96">404</h1>
      <p className="mt-4 max-w-[40ch]">
        There is no page here. The entry may have been withdrawn or never approved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-solid">
          The feed
        </Link>
        <Link href="/leaderboard" className="btn">
          The record
        </Link>
      </div>
    </main>
  );
}
