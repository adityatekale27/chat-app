"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/auth/FormError";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

// Zod schema with password match validation
const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

export default function ResetPassword() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    setFormError("");

    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 2000));
      toast.success("Password has been reset!");

      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error(error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="max-w-sm md:max-w-3xl">
        <Form {...form}>
          <div className="w-sm">
            <Card className="overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold">Reset your password</h1>
                    <p className="text-muted-foreground text-sm mt-3">Enter your new password below. Make sure it’s something secure.</p>
                  </div>

                  {/* New password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type={showPassword ? "text" : "password"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
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

                  {formError && <FormError message={formError} />}

                  <Button type="submit" disabled={isLoading} className="w-full hover:cursor-pointer">
                    {isLoading ? "Setting Password..." : "Set Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </Form>
      </div>
    </main>
  );
}
