"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { validateInviteCode } from "@/lib/mock/marketplace-data";

type InviteCodeFormProps = {
  variant?: "compact" | "callout";
};

// Canjea un código de invitación contra ACCESS_GRANTS (mock) y navega a la
// propiedad correspondiente. No crea sesión: si esa propiedad exige login,
// middleware.ts la sigue protegiendo después de este canje (ver
// lib/types/marketplace.ts).
export default function InviteCodeForm({ variant = "compact" }: InviteCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    const property = validateInviteCode(code);

    if (!property) {
      toast.error("Ese código de invitación no es válido o ya expiró.");
      setIsSubmitting(false);
      return;
    }

    toast.success(`Código válido — bienvenido a ${property.name}.`);
    router.push(`/p/${property.slug}`);
  }

  const isCompact = variant === "compact";

  return (
    <form
      onSubmit={handleSubmit}
      className={isCompact ? "flex items-center gap-2" : "flex flex-col gap-3 sm:flex-row"}
    >
      <input
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Código de invitación"
        className={
          isCompact
            ? "w-full min-w-0 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            : "w-full flex-1 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        }
      />
      <button
        type="submit"
        disabled={isSubmitting || !code.trim()}
        className={
          isCompact
            ? "shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            : "shrink-0 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        }
      >
        Canjear
      </button>
    </form>
  );
}
