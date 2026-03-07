"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-terracotta border-t-transparent rounded-full"></div>
    </div>
  );
}
