"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors duration-200 ease-in-out hover:text-neutral-900"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
      Volver
    </button>
  );
}
