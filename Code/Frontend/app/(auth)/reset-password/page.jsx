"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    new_password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords must match",
    path: ["confirm"],
  });

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Missing reset token");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, data.new_password);
      toast.success("Password reset. Please sign in.");
      router.push("/login");
    } catch (e) {
      toast.error(e.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-slate-900/80 border-white/10">
      <CardHeader>
        <CardTitle className="text-slate-100">Reset password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" {...register("new_password")} />
            {errors.new_password && (
              <p className="text-sm text-rose-500">{errors.new_password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input type="password" {...register("confirm")} />
            {errors.confirm && <p className="text-sm text-rose-500">{errors.confirm.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-6">
      <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
