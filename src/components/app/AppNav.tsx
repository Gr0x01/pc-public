import Link from "next/link";
import NavLinks from "./NavLinks";
import Logo from "@/components/ui/Logo";

interface AppNavProps {
  initials: string;
  signOut: () => Promise<void>;
}

export default function AppNav({ initials, signOut }: AppNavProps) {
  return (
    <header className="h-14 bg-[#07111F] border-b border-border-dark flex items-center px-4 shrink-0">
      {/* Logo */}
      <Link
        href="/app/products"
        className="flex items-center gap-2 mr-8 group shrink-0"
      >
        <span
          className="h-2 w-2 rounded-full bg-canary group-hover:scale-110 transition-transform duration-150"
          aria-hidden="true"
        />
        <Logo className="h-2.5 text-white" />
      </Link>

      {/* Center nav */}
      <div className="flex-1 flex justify-center">
        <NavLinks />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/app/settings"
          className="h-8 w-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors duration-100"
          title="Settings"
        >
          <span className="text-xs font-semibold text-slate-200 leading-none select-none">
            {initials}
          </span>
        </Link>
        {/* Upgrade/Billing hidden during pilot program */}
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-100 leading-none"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
