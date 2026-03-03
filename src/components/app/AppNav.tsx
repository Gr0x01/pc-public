import Link from "next/link";
import NavLinks from "./NavLinks";

interface AppNavProps {
  email: string;
  signOut: () => Promise<void>;
}

export default function AppNav({ email, signOut }: AppNavProps) {
  return (
    <header className="h-14 bg-[#07111F] border-b border-border-dark flex items-center px-4 shrink-0">
      {/* Logo */}
      <Link
        href="/app/feed"
        className="flex items-center gap-2 mr-8 group shrink-0"
      >
        <span
          className="h-2 w-2 rounded-full bg-canary group-hover:scale-110 transition-transform duration-150"
          aria-hidden="true"
        />
        <span className="font-bold text-white text-sm tracking-tight">
          Policy Canary
        </span>
      </Link>

      {/* Center nav */}
      <div className="flex-1 flex justify-center">
        <NavLinks />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="font-mono text-xs text-slate-400 hidden sm:block">
          {email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
