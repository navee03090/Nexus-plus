"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState("Opening the email link…");

  useEffect(() => {
    let active = true;
    let claimed = false;
    let unsubscribe = () => {};

    const establish = async (accessToken: string) => {
      if (claimed) return;
      claimed = true;
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (!active) return;
      if (!res.ok) {
        await supabase.auth.signOut();
        setNotice("");
        setErrorMsg("This link cannot open the admin area.");
        return;
      }
      window.history.replaceState({}, "", "/admin/reset");
      setNotice("");
      setReady(true);
    };

    const load = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && active) {
          setNotice("");
          setErrorMsg("This link is invalid or expired. Request a new one from the admin sign-in page.");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        await establish(data.session.access_token);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) void establish(session.access_token);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    };

    const timer = window.setTimeout(() => {
      if (!active || claimed) return;
      setNotice("This link is missing or expired. Request a new one from the admin sign-in page.");
    }, 2500);

    void load();
    return () => {
      active = false;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    if (password.length < 8) {
      setErrorMsg("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: data.session.access_token }),
        });
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMsg("Could not save the password. Try again.");
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
          <h1 className="text-2xl font-bold tracking-tight text-np-text">Choose your admin password</h1>
          <p className="text-sm text-np-muted">This password is the one you will use next time.</p>
        </div>

        {errorMsg ? (
          <div className="rounded-np border border-np-danger/30 bg-np-danger/10 p-3 text-xs text-np-danger">{errorMsg}</div>
        ) : null}
        {notice ? <p className="text-center text-sm text-np-muted">{notice}</p> : null}

        {ready ? (
          <form onSubmit={savePassword} className="np-panel space-y-4 p-6 sm:p-8">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-np-muted">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="np-input"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-np-muted">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="np-input"
              />
            </div>
            <button type="submit" disabled={loading} className="np-btn-primary w-full py-3">
              {loading ? "Saving…" : "Save password and open admin"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
