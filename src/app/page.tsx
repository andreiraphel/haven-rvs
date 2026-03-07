"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="bg-sand flex flex-col items-center justify-center min-h-[100vh]">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-terracotta border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-bark font-sora font-medium">Loading HAVEN-RVS...</p>
      </div>
    </div>
  );
}
