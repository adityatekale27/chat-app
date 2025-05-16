"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormError } from "./FormError";
import toast from "react-hot-toast";
import axios from "axios";

interface ForgotPasswordProps {
  onClose: () => void;
}

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "A valid email is required, please add" }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPassword({ onClose }: ForgotPasswordProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setFormError("");

    try {
      await axios.post("/api/auth/password/forgot-password");

      console.log(data);
      toast.success("");
      onClose();
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div className="w-sm">
        <Card className="overflow-hidden">
          <CardContent className="grid p-0">
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Forgot your password?</h1>
                  <p className="text-balance leading-tight text-muted-foreground mt-3">Enter your email and we’ll send you a link to reset your password.</p>
                </div>

                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" className="placeholder:text-sm md:placeholder:text-base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {formError && <FormError message={formError} />}

                <Button disabled={isLoading} type="submit" className="w-full hover:cursor-pointer">
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center text-sm mt-2">
                  Remember your password?{" "}
                  <span onClick={onClose} className="cursor-pointer underline underline-offset-4 hover:underline-offset-2">
                    Back to login
                  </span>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
