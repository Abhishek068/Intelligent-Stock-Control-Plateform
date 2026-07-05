"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Mail, Lock, LogIn, ShieldCheck, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserStore } from "@/lib/store";
import ThreeDCanvas from "@/components/ThreeDCanvas";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().default(false),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const DEMO_CREDENTIALS = {
  admin: { email: "admin@stockcontrolsystem.com", password: "admin1234", role: "admin" },
  manager: { email: "manager@stockcontrolsystem.com", password: "manager1234", role: "manager" },
  staff: { email: "staff@stockcontrolsystem.com", password: "staff1234", role: "staff" },
};

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useUserStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [activeTab, setActiveTab] = useState("login");

  // Form hooks
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    reset: resetSignup,
    formState: { errors: signupErrors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError(null);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const foundUser = Object.values(DEMO_CREDENTIALS).find(
      (user) => user.email === data.email && user.password === data.password
    );

    if (foundUser) {
      setRole(foundUser.role);
      toast.success(`Successfully signed in as ${foundUser.role}!`);
      router.push(`/${foundUser.role}`);
    } else {
      setLoginError("Invalid email or password. Please try again.");
    }
    setIsLoading(false);
  };

  const onSignupSubmit = async (data) => {
    setIsLoading(true);
    setLoginError(null);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Account created successfully! You can now sign in.");
    setValue("email", data.email); // Auto fill user's registered email
    resetSignup();
    setActiveTab("login");
    setIsLoading(false);
  };

  const handleDemoLogin = (role) => {
    const creds = DEMO_CREDENTIALS[role];
    setValue("email", creds.email);
    setValue("password", creds.password);
    setTimeout(() => handleSubmit(onSubmit)(), 100);
  };

  return (
    <div className="grid min-h-screen w-full overflow-hidden bg-slate-950 lg:grid-cols-2">
      {/* Left Column: 3D Animated Canvas and Brand Tag */}
      <div className="relative flex flex-col justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-955 p-12 text-white overflow-hidden min-h-[400px] lg:min-h-screen">
        {/* Render 3D scene in absolute background */}
        <ThreeDCanvas />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
        
        {/* Overlay content layered on top */}
        <div className="relative z-10 pointer-events-none select-none">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/20 p-3 backdrop-blur-md">
              <ShieldCheck className="h-10 w-10 text-teal-400" />
            </div>
            <span className="text-3xl font-bold tracking-tight drop-shadow-md">
              Stock<span className="text-teal-400">Control System</span>
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold leading-tight drop-shadow-md">Intelligent Inventory Control</h2>
          <p className="mt-4 max-w-sm text-slate-300 drop-shadow-sm">
            Role-based access for Admin, Managers, and Staff. Powered by predictive forecasting.
          </p>
        </div>
      </div>

      {/* Right Column: Dynamic Form (Login/Signup Tabs) */}
      <div className="flex flex-col justify-center bg-black p-12 sm:p-10 lg:p-12 lg:min-h-screen">
        <div className="mx-auto w-full max-w-xl">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-9 py-6 text-center">
              <CardTitle className="text-2xl font-bold text-slate-200">
                {activeTab === "login" ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login"
                  ? "Sign in to your account to manage inventory"
                  : "Get started by creating your user profile"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-900 border border-slate-800 p-1">
                  <TabsTrigger
                    value="login"
                    className="text-slate-400 data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all duration-300"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="text-slate-400 data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all duration-300"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Login Form Content */}
                <TabsContent value="login">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@stockcontrolsystem.com"
                          className="pl-10 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500"
                          {...register("email")}
                        />
                      </div>
                      {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500"
                          {...register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" className="border-slate-700 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600" {...register("remember")} />
                        <Label htmlFor="remember" className="text-sm font-normal text-slate-300">Remember me</Label>
                      </div>
                    </div>

                    {loginError && (
                      <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
                        <AlertDescription>{loginError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        "Signing in..."
                      ) : (
                        <span className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" /> Sign in
                        </span>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Sign Up Form Content */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500"
                          {...registerSignup("name")}
                        />
                      </div>
                      {signupErrors.name && <p className="text-sm text-red-500">{signupErrors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500"
                          {...registerSignup("email")}
                        />
                      </div>
                      {signupErrors.email && <p className="text-sm text-red-500">{signupErrors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500"
                          {...registerSignup("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signupErrors.password && <p className="text-sm text-red-500">{signupErrors.password.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="signup-confirm-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500"
                          {...registerSignup("confirmPassword")}
                        />
                      </div>
                      {signupErrors.confirmPassword && (
                        <p className="text-sm text-red-500">{signupErrors.confirmPassword.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        "Creating account..."
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" /> Create Account
                        </span>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            {activeTab === "login" && (
              <CardFooter className="flex flex-col items-start gap-4 px-0 pt-2">
                <div className="w-full border-t border-slate-800" />
                <div className="w-full space-y-2 px-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Quick Access
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleDemoLogin("admin")}
                      className="border-teal-900 bg-teal-950 text-teal-400 hover:bg-teal-900 transition-all duration-300"
                    >
                      Admin
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleDemoLogin("manager")}
                      className="border-blue-900 bg-blue-950 text-blue-400 hover:bg-blue-900 transition-all duration-300"
                    >
                      Manager
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleDemoLogin("staff")}
                      className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-all duration-300"
                    >
                      Staff
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}