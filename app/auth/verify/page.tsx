"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VerifyContent() {
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
          // Direct redirect instead of router
          window.location.href = "/events";
        } else {
          setStatus("error");
          setError(data.message || "Invalid or expired link");
        }
      })
      .catch(() => { setStatus("error"); setError("Verification failed"); });
  }, [token]);

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
            <p className="text-gray-600">Redirecting to events...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <a href="/auth/signin" className="text-green-600 hover:text-green-700 font-medium">Request a new link</a>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
