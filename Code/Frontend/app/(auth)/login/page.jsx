"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Mail, Lock, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/auth.store";
import { ApiError } from "@/lib/api/client";
import ThreeDCanvas from "@/components/ThreeDCanvas";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().default(false)
});

const DEMO_EMAILS = {
  admin: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? "",
  manager: process.env.NEXT_PUBLIC_DEMO_MANAGER_EMAIL ?? "",
  staff: process.env.NEXT_PUBLIC_DEMO_STAFF_EMAIL ?? ""
};

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Signed in as ${user.role}`);
      router.push(`/${user.role}`);
    } catch (error) {
      const message =
      error instanceof ApiError ?
      String(error.message) :
      error instanceof Error ?
      error.message :
      "Invalid email or password.";
      setLoginError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const prefillEmail = (role) => {
    const email = DEMO_EMAILS[role];
    if (email) setValue("email", email);
  };

  return (
    <div className="grid min-h-screen w-full overflow-hidden bg-[#0B0F1A] lg:grid-cols-2">
      <div className="relative flex flex-col justify-center bg-gradient-to-br from-[#0B0F1A] via-slate-900 to-[#0F172A] p-12 text-white overflow-hidden min-h-[400px] lg:min-h-screen">
        <ThreeDCanvas />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 pointer-events-none select-none">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/20 p-3 backdrop-blur-md border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <ShieldCheck className="h-10 w-10 text-indigo-400" />
            </div>
            <span className="text-3xl font-bold tracking-tight drop-shadow-md">
              Stock<span className="text-indigo-400">Sense</span>
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold leading-tight drop-shadow-md text-slate-100">Enterprise Operations Platform</h2>
          <p className="mt-4 max-w-sm text-slate-400 drop-shadow-sm leading-relaxed">
            Intelligent inventory control with real-time forecasting, AI-driven alerts, and role-based access.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center relative p-12 sm:p-10 lg:p-12 lg:min-h-screen">
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-3xl -z-10" />
        <div className="mx-auto w-full max-w-md">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-6 py-6 text-center">
              <CardTitle className="text-2xl font-bold text-slate-100">Welcome Back</CardTitle>
              <CardDescription className="text-slate-400">Sign in to your account</CardDescription>
            </CardHeader>
            <CardContent className="px-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="pl-10"
                      {...register("email")} />
                    
                  </div>
                  {errors.email && <p className="text-sm text-rose-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register("password")} />
                    
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors">
                      
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-rose-500">{errors.password.message}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="border-white/10 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" {...register("remember")} />
                  <Label htmlFor="remember" className="text-sm font-normal text-slate-400 cursor-pointer">Remember me</Label>
                </div>

                {loginError &&
                <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                }

                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? "Signing in..." :
                  <span className="flex items-center gap-2">Sign in</span>
                  }
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 px-6 pt-4">
              <div className="w-full border-t border-white/5" />
              <div className="w-full space-y-3 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Quick Login Demo
                </p>
                <div className="flex flex-wrap gap-2">
                  {["admin", "manager", "staff"].map((role) =>
                  <Button
                    key={role}
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={!DEMO_EMAILS[role]}
                    onClick={() => prefillEmail(role)}
                    className="capitalize text-xs h-7">
                    
                      {role}
                    </Button>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
