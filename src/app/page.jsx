"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSkeleton className="h-10 w-40" />
    </div>
  );
}