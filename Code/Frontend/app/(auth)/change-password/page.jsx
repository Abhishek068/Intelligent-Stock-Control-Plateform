"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    current_password: z.string().optional(),
    new_password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords must match",
    path: ["confirm"],
  });

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const mustChange = user?.must_change_password;
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.changePassword(
        mustChange ? "" : data.current_password || "",
        data.new_password
      );
      if (res.data?.user) setUser(res.data.user);
      toast.success("Password updated");
      if (user?.is_superuser || user?.role === "admin") router.push("/admin");
      else if (user?.role === "manager") router.push("/manager");
      else router.push("/staff");
    } catch (e) {
      toast.error(e.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-6">
      <Card className="w-full max-w-md bg-slate-900/80 border-white/10">
        <CardHeader>
          <CardTitle className="text-slate-100">
            {mustChange ? "Set a new password" : "Change password"}
          </CardTitle>
          <CardDescription>
            {mustChange
              ? "You must change your temporary password before continuing."
              : "Update your account password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!mustChange && (
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" {...register("current_password")} />
              </div>
            )}
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
              {errors.confirm && (
                <p className="text-sm text-rose-500">{errors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
