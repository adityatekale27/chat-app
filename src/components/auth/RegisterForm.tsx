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
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";

/* Registration zod schema */
const RegisterSchema = z.object({
  name: z.string({ required_error: "Name is required" }).trim(),
  email: z.string({ required_error: "Email is required" }).email("Invalid email format").trim().toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .trim()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});
type RegisterFormValues = z.infer<typeof RegisterSchema>;

export function RegisterForm({ className, ...props }: React.ComponentProps<"div">) {
  const { login } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [signUpError, setSignUpError] = useState("");
  const [signUpDisable, setSignUpDisable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* Create form with initial values using useForm */
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  /* Register user using name, email and password */
  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);

      await axios.post("/api/auth/register", data);
      const result = await login("credentials", data);

      if (result?.error === "Too many signup attempts") {
        // if rate limit is hit, disbale signup for 10sec
        setSignUpDisable(true);
        let countdown = 10;

        const interval = setInterval(() => {
          countdown--;
          setSignUpError(`Too many signup attempts, try after ${countdown}s`);
          if (countdown <= 0) {
            clearInterval(interval);
            setSignUpError("");
            setSignUpDisable(false);
          }
        }, 1000);
      } else if (result?.error) {
        console.log("error on register submit", result.error);
        toast.error("Something went wrong!");
      }

      if (result?.ok && !result?.error) {
        form.reset();
        toast.success("Registration Successful!");
        router.push("/chat");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Register error:", error);
        toast.error(error.response?.data?.message || error.response?.data?.error || "Registration failed");
      } else {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div className={cn(" w-sm", className)} {...props}>
        <Card className="overflow-hidden">
          <CardContent className="grid p-0 ">
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center ">
                  <h1 className="text-2xl font-bold">Welcome</h1>
                  <p className="text-balance text-muted-foreground">Register to start new conversation</p>
                </div>

                {/* Name field */}
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input type="name" placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email field */}
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email*</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password field */}
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password*</FormLabel>
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

                {/* Show registration error (rate limiter error or credentails error) */}
                {signUpError && <FormError message={signUpError} />}

                {/* Action button (sign up) */}
                {isLoading ? (
                  <Button disabled type="submit">
                    <Loader2 className="animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button disabled={signUpDisable} type="submit" className="w-full hover:cursor-pointer">
                    Sign up
                  </Button>
                )}
              </div>
            </form>
            <div className="text-center text-sm pb-4">
              <span className="mr-2">Already have an account?</span>
              <Link href="/" className="underline underline-offset-4 hover:underline-offset-2">
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
