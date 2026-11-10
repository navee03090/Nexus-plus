"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setErrorMsg("Email or password is incorrect.");
        return;
      }
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token }),
      });
      if (!res.ok) {
        await supabase.auth.signOut();
        setErrorMsg("This account cannot open the admin area.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMsg("Could not reach the sign-in service. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-np-lg border border-white/10 bg-np-surface text-np-accent">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-np-text">Admin sign in</h1>
          <p className="text-sm text-np-muted">This area is only for the site operator.</p>
        </div>

        <form onSubmit={handleLogin} className="np-panel space-y-4 p-6 sm:p-8">
          {errorMsg ? (
            <div className="rounded-np border border-np-danger/30 bg-np-danger/10 p-3 text-xs text-np-danger">
              {errorMsg}
            </div>
          ) : null}
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-xs font-medium text-np-muted">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="np-input"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-xs font-medium text-np-muted">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="np-input"
            />
          </div>
          <button type="submit" disabled={loading} className="np-btn-primary w-full py-3">
            {loading ? "Checking…" : "Open admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
