"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setError("No token provided"); return; }
    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          setTimeout(() => router.push("/events"), 2000);
        } else {
          setStatus("error");
          setError(data.message || "Invalid or expired link");
        }
      })
      .catch(() => { setStatus("error"); setError("Verification failed"); });
  }, [token, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <h1 className="text-xl font-bold text-gray-900">Verifying...</h1>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Signed in!</h1>
            <p className="text-gray-600">Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/auth/signin" className="text-green-600 hover:text-green-700 font-medium">Request a new link</Link>
          </>
        )}
      </div>
    </div>
  );
}
