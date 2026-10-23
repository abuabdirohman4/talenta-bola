"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { markAllRead } from "../actions";

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await markAllRead();
          if ("error" in r) toast.error(r.error);
        })
      }
    >
      Tandai semua dibaca
    </Button>
  );
}
