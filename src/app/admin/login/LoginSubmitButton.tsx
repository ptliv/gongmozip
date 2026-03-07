"use client";

import { useFormStatus } from "react-dom";
import { LogIn, Loader2 } from "lucide-react";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      {pending ? "로그인 중..." : "로그인"}
    </button>
  );
}
