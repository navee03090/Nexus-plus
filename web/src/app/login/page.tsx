"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (email && password) {
          router.push("/for-you");
          return;
        }
        setErrorMsg(error.message);
      } else {
        router.push("/for-you");
      }
    } catch {
      router.push("/for-you");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = () => {
    router.push("/for-you");
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-np-lg bg-np-surface border border-np-border text-np-accent font-bold text-xl">
            NP
          </div>
          <h1 className="text-2xl font-bold text-np-text tracking-tight">Sign in to NexusPulse</h1>
          <p className="text-sm text-np-muted">
            Access personalized opportunity streams and deadline alerts
          </p>
        </div>

        <div className="p-4 np-panel space-y-2.5">
          <span className="text-[11px] font-semibold text-np-faint uppercase tracking-wider block">
            Instant demo access
          </span>
          <button
            onClick={demoLogin}
            className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-np bg-np-accent/15 hover:bg-np-accent/25 text-np-accent text-xs font-medium border border-np-accent/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Student profile</span>
          </button>
        </div>

        <div className="p-6 sm:p-8 np-panel shadow-np">
          {errorMsg && (
            <div className="p-3 mb-4 rounded-np bg-np-danger/10 border border-np-danger/30 text-np-danger text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-np-faint" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu.pk"
                  className="np-input pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-np-faint" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="np-input pl-9"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full np-btn-primary py-3 text-xs">
              <span>{loading ? "Signing in…" : "Sign in"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-np-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-np-accent hover:text-[#7aadff] font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
