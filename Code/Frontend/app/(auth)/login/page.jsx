"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Sparkles, TrendingUp, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/auth.store";
import { ApiError } from "@/lib/api/client";
import ThreeDCanvas from "@/components/ThreeDCanvas";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().default(false),
});

function dashboardPath(user) {
  if (user.must_change_password) return "/change-password";
  if (user.is_superuser || user.role === "admin") return "/admin";
  if (user.role === "manager") return "/manager";
  return "/staff";
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [remember, setRemember] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const user = await login(data.email, data.password, remember);
      toast.success(`Signed in as ${user.primaryRole || user.role}`);
      router.push(dashboardPath(user));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? String(error.message)
          : error instanceof Error
            ? error.message
            : "Invalid email or password.";
      setLoginError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#090D16] text-white flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-[#090D16] via-[#0E1528] to-[#090D16] pointer-events-none" />
      <div className="absolute top-1/4 left-10 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-12 gap-12 items-center min-h-screen">
        <div className="lg:col-span-7 relative flex flex-col justify-center min-h-[420px] lg:min-h-[600px] p-6 lg:p-12">
          <div className="absolute inset-0 pointer-events-none opacity-90">
            <ThreeDCanvas />
          </div>

          <div className="relative z-10 pointer-events-none select-none max-w-xl">
            <div className="mb-6 flex items-center gap-3">
              <img src="/logo.jpg" alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg shadow-indigo-500/10" />
              <div>
                <span className="text-3xl font-extrabold tracking-tight block">
                  Stock Control <span className="text-indigo-400">System</span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300/80">
                  Enterprise Inventory Platform
                </span>
              </div>
            </div>

            <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Intelligent Inventory Operations
            </h2>

            <p className="mt-4 text-slate-300 text-base sm:text-lg leading-relaxed max-w-lg">
              Seamlessly orchestrate your supply chain with real-time AI demand forecasting, automated reorders, and granular role-based access control.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300">AI Forecasting Engine</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300">Role-Based IAM</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300">Real-Time Telemetry</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-center relative w-full max-w-md mx-auto">
          <Card className="border border-white/[0.09] bg-slate-900/40 backdrop-blur-2xl shadow-[0_25px_80px_0_rgba(0,0,0,0.55),0_0_50px_0_rgba(99,102,241,0.12)] rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <CardHeader className="px-8 pt-8 pb-4 text-center">
              <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2 text-sm">
                Sign in to manage your inventory dashboard
              </CardDescription>
              <div className="h-0.5 w-12 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-4 rounded-full opacity-60" />
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-300">
                    Email address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors duration-200" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="pl-10 h-11 bg-slate-950/60 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 rounded-xl"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-rose-400 font-medium mt-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-300">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors duration-200" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11 bg-slate-950/60 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 rounded-xl"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-rose-400 font-medium mt-1">{errors.password.message}</p>}
                </div>

                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(!!v)}
                    className="border-white/20 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded"
                  />
                  <Label htmlFor="remember" className="text-sm font-medium text-slate-400 cursor-pointer select-none hover:text-slate-300 transition-colors">
                    Remember me
                  </Label>
                </div>

                {loginError && (
                  <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400 rounded-xl">
                    <AlertDescription className="text-xs font-medium">{loginError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full mt-4 h-11 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

