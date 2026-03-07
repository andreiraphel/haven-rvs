"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Immediate client-side redirect
    router.replace("/login");
  }, [router]);

  return (
    <html lang="en">
      <head>
        {/* Fallback meta refresh if JS is disabled or slow */}
        <meta httpEquiv="refresh" content="0;url=/login" />
      </head>
      <body className="bg-sand flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-terracotta border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-bark font-sora font-medium">Loading HAVEN-RVS...</p>
        </div>
      </body>
    </html>
  );
}
