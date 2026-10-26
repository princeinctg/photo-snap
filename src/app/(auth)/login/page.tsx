"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Camera, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/layout/ThemeProvider";

export default function LoginPage() {
  const { studioName, studioLogo } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        window.location.href = "/";
      } else {
        setErrorMsg(data.error || "Login failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("owner@photostudio.com");
    setPassword("StudioAdmin123!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="max-w-md w-full p-8 shadow-2xl border bg-card/90 backdrop-blur-xl relative z-10">
        <div className="text-center space-y-3 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-sm overflow-hidden">
            {studioLogo ? (
              <img src={studioLogo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-7 w-7" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {studioName || "Photo Studio OS"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in to manage bookings, clients, invoices, and studio financials.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Studio Owner Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                required
                placeholder="owner@photostudio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <span className="text-[11px] text-primary cursor-pointer hover:underline">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-10 font-semibold shadow-md">
            {loading ? "Authenticating..." : "Sign In to Studio OS"}
          </Button>

          {/* Quick Demo Credentials shortcut */}
          <div className="pt-2">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-2 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Fill Default Studio Owner Login</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
          Need a new studio workspace?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Register Studio
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>100% Free Forever • Zero Subscription Locks</span>
        </div>
      </Card>
    </div>
  );
}
