"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex w-fit items-center gap-1 text-sm font-medium text-neutral-600 transition-colors duration-200 ease-in-out hover:text-neutral-900"
    >
      <span aria-hidden="true">←</span>
      Volver
    </button>
  );
}
