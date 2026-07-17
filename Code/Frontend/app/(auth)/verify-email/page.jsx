"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  const verify = async () => {
    if (!token) {
      toast.error("Missing verification token");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyEmail(token);
      setMessage(res.data?.message || "Email verified.");
      setDone(true);
      toast.success("Email verified");
    } catch (e) {
      toast.error(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-slate-900/80 border-white/10">
      <CardHeader>
        <CardTitle className="text-slate-100">Verify email</CardTitle>
        <CardDescription>
          Confirm your email to receive a temporary password and continue onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <>
            <p className="text-sm text-slate-300">{message}</p>
            <Link href="/login">
              <Button className="w-full">Go to login</Button>
            </Link>
          </>
        ) : (
          <Button className="w-full" onClick={verify} disabled={loading || !token}>
            {loading ? "Verifying..." : "Verify email"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-6">
      <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
