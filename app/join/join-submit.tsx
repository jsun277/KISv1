"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function JoinSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 w-full text-base">
      {pending ? "Joining..." : "Join athlete"}
    </Button>
  );
}
