import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-2">
            <PackageSearch className="h-7 w-7 text-primary" />
            StockFlow Pro
          </Link>
          <p className="text-sm text-muted-foreground">
            Manage inventory. Track sales. Grow smarter.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}