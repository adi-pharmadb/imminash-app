"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

export default function TestAuthPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <button onClick={() => setOpen(true)} className="text-white bg-primary px-4 py-2 rounded">
        Open Auth Modal
      </button>
      <AuthModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
