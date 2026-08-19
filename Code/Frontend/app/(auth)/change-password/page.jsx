"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    current_password: z.string().optional(),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string().min(8, "Confirm password must be at least 8 characters"),
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

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      if (res?.data?.user) setUser(res.data.user);
      toast.success("Password changed successfully!");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-6 relative">
      <Card className="w-full max-w-md bg-slate-900/80 border-white/10 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-slate-100 text-xl font-bold">
            {mustChange ? "Set a new password" : "Change Password"}
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            {mustChange
              ? "You must change your temporary password before continuing."
              : "Update your StockSense account password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!mustChange && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Current password</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    {...register("current_password")}
                    className="bg-slate-950/60 border-white/10 text-slate-100 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  {...register("new_password")}
                  className="bg-slate-950/60 border-white/10 text-slate-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-xs text-rose-400">{errors.new_password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Confirm new password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  {...register("confirm")}
                  className="bg-slate-950/60 border-white/10 text-slate-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-rose-400">{errors.confirm.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} className="w-1/2 border-white/10 text-slate-300 hover:bg-slate-800 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="w-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer" disabled={loading}>
                {loading ? "Saving..." : "Save password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
