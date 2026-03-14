"use client";
import { Suspense } from "react";
import Questionnaire from "./Questionnaire";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20"><div className="animate-spin h-6 w-6 border-2 border-terracotta border-t-transparent rounded-full"></div></div>}>
      <Questionnaire />
    </Suspense>
  );
}
