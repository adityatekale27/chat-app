"use client";

import { cn } from "@/libs/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormError } from "./FormError";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import ToolTip from "../others/Tooltip";
import ForgotPassword from "./ForgotPassword";

/* login schema using zod */
const LoginSchema = z.object({
  email: z.string().email({ message: "Email is required" }).trim().toLowerCase(),
  password: z.string(),
});
type LoginFormValues = z.infer<typeof LoginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginDisable, setLoginDisable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPassword] = useState(false);

  /* create form with initial values */
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /* handler for login */
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const result = await login("credentials", data);

    if (result?.error === "Invalid credentials") {
      setLoginError("Invalid credentials");
      console.log("error on login submit:", result.error);
    } else if (result?.error === "Too many login attempts") {
      setLoginDisable(true);
      let countdown = 10;

      const interval = setInterval(() => {
        countdown--;

        setLoginError(`Too many login attempts, try after ${countdown}s`);

        if (countdown <= 0) {
          clearInterval(interval);
          setLoginError("");
          setLoginDisable(false);
          setIsLoading(false);
        }
      }, 1000);

      return () => clearInterval(interval);
    }

    if (result?.ok && !result?.error) {
      setLoginError("");
      form.reset();
      toast.success("Logged in!");
      router.push("/chat");
    }

    setIsLoading(false);
  };

  /* handler for social login (google, github) */
  const socialLogin = async (provider: "google" | "github") => {
    setIsLoading(true);

    const callback = await login(provider);

    if (callback?.error) {
      toast.error("Something went wrong, try again!");
      console.log("socialLogin error:", callback.error);
    }
    if (callback?.ok && !callback?.error) {
      toast.error("Logged in!");
      router.push("/chat");
    }

    setIsLoading(false);
  };

  return (
    <>
      {showForgotPasswordDialog ? (
        <ForgotPassword onClose={() => setShowForgotPassword(false)} />
      ) : (
        <Form {...form}>
          <div className={cn(" w-sm", className)} {...props}>
            <Card className="overflow-hidden">
              <CardContent className="grid p-0 ">
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center text-center">
                      <h1 className="text-2xl font-bold">Welcome back</h1>
                      <p className="text-balance text-muted-foreground">Login to your account</p>
                    </div>

                    {/* Email field */}
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input className="placeholder:text-sm md:placeholder:text-base" type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Password field with forgot password link */}
                    <div className="grid gap-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center">
                              <FormLabel>Password</FormLabel>
                              <div
                                onClick={() => setShowForgotPassword(true)}
                                className="hover:cursor-pointer ml-auto dark:text-gray-300 text-gray-600/70 text-sm underline-offset-2 hover:underline hover:text-gray-500">
                                Forgot your password?
                              </div>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Input type={showPassword ? "text" : "password"} {...field} />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-1 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                  aria-label={showPassword ? "Hide password" : "Show password"}>
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Show rate limiter and credentials error */}
                    {loginError && <FormError message={loginError} />}

                    {/* Action buttons */}
                    {isLoading ? (
                      <Button disabled>
                        <Loader2 className="animate-spin" />
                        Please wait
                      </Button>
                    ) : (
                      <Button disabled={loginDisable} type="submit" className="w-full hover:cursor-pointer">
                        Login
                      </Button>
                    )}
                  </div>
                </form>
                <div className="flex flex-col gap-6">
                  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 px-2 text-muted-foreground">Or continue with</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 px-8">
                    {/* social login button (github) */}
                    <ToolTip content="Login with Github">
                      <Button onClick={() => socialLogin("github")} variant="outline" className="w-full cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path
                            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="sr-only">Login with Github</span>
                      </Button>
                    </ToolTip>

                    {/* social login button (google) */}
                    <ToolTip content="Login with Google">
                      <Button onClick={() => socialLogin("google")} variant="outline" className="w-full cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="sr-only">Login with Google</span>
                      </Button>
                    </ToolTip>
                  </div>
                  <div className="text-center text-sm pb-6">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="underline underline-offset-4 hover:underline-offset-2">
                      Sign up
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Form>
      )}
    </>
  );
}
