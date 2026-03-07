"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Force immediate redirection
    router.replace("/login");
  }, [router]);

  return (
    <div className="bg-sand flex flex-col items-center justify-center min-h-screen">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-terracotta border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="font-sora font-bold text-ink">Redirecting to HAVEN-RVS...</h1>
      </div>
    </div>
  );
}
