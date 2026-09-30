"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 grid gap-3">
      <input className="field" type="password" name="password" placeholder="סיסמה" autoFocus required autoComplete="current-password" />
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "בודק..." : "כניסה"}
      </button>
    </form>
  );
}
