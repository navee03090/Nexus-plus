"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) {
        router.push("/for-you");
      } else {
        router.push("/for-you");
      }
    } catch {
      router.push("/for-you");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-np-lg bg-np-surface border border-np-border text-np-accent font-bold text-xl">
            NP
          </div>
          <h1 className="text-2xl font-bold text-np-text tracking-tight">Create a NexusPulse account</h1>
          <p className="text-sm text-np-muted">
            Never miss scholarships, hackathons, or incubation deadlines across Pakistan
          </p>
        </div>

        <div className="p-6 sm:p-8 np-panel shadow-np">
          {errorMsg && (
            <div className="p-3 mb-4 rounded-np bg-np-danger/10 border border-np-danger/30 text-np-danger text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-np-faint" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="np-input pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-np-muted mb-1.5">
                University / official email
              </label>
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
              <span>{loading ? "Creating account…" : "Create account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-np-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-np-accent hover:text-[#7aadff] font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
