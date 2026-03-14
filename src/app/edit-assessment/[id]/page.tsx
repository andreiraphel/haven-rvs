"use client";
import { Suspense, use } from "react";
import Questionnaire from "@/app/questionnaire/Questionnaire";

export default function EditAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrapping params using React.use() as recommended in Next.js 15+ for async params
  const { id } = use(params);

  return (
    <Suspense fallback={<div className="flex justify-center p-20"><div className="animate-spin h-6 w-6 border-2 border-terracotta border-t-transparent rounded-full"></div></div>}>
      <Questionnaire assessmentId={id} />
    </Suspense>
  );
}