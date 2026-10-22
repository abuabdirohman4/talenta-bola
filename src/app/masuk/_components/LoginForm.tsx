"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { signIn } from "../actions";

/** Form kode akses; `action` lain dipakai /admin/masuk (kode super-admin). */
export function LoginForm({ action: submit = signIn }: { action?: typeof signIn }) {
  const [state, action, pending] = useActionState(submit, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="eyebrow mb-1.5 block">Kode akses</span>
        <span className="relative block">
          <input
            name="code"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            className={inputClass + " pr-12"}
            aria-invalid={!!state?.error}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted"
            aria-label={show ? "Sembunyikan kode" : "Tampilkan kode"}
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-alpa">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Masuk
      </Button>
    </form>
  );
}
