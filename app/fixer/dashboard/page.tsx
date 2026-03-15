"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to unified volunteer dashboard
export default function FixerDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/volunteer/dashboard"); }, [router]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );
}
