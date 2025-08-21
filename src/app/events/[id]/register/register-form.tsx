"use client";

import { useTransition, useState } from "react";
import { registerAttendee } from "@/actions/attendees";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  attendeeRegisterSchema,
  type AttendeeRegisterInput,
} from "@/schemas/attendees";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckCircle, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

// Centralized schema used for validation

interface Props {
  eventId: string;
}

export default function RegisterForm({ eventId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();

  const form = useForm<AttendeeRegisterInput>({
    resolver: zodResolver(attendeeRegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      eventId,
    },
  });

  const onSubmit = async (data: AttendeeRegisterInput) => {
    if (step === 1) {
      setStep(2);
      return;
    }
    startTransition(async () => {
      const res = await registerAttendee({
        ...data,
      });
      if (res?.errors || res?.message) {
        toast.error(res.message || "Registration failed");
      } else if (res?.success) {
        // Show success animation before redirect
        setIsSuccess(true);
        toast.success("Registration successful! Redirecting...");
        // Let success animation play for 1.5 seconds before redirect
        try {
          if (typeof window !== "undefined") {
            const payload = {
              eventId,
              attendeeId: res.attendeeId ?? null,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
            };
            sessionStorage.setItem(
              "rsvp_confirmation",
              JSON.stringify(payload)
            );
          }
        } catch {}
        setTimeout(() => {
          // After successful registration, offer ticket purchase option
          router.push(`/events/${eventId}/register/thanks?showPurchase=true`);
        }, 1500);
      }
    });
  };

  // Show success state
  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="animate-bounce mb-4">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Registration Successful!
        </h3>
        <p className="text-zinc-400">Redirecting to confirmation page...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      {/* Progress indicator with labels */}
      <div className="mb-4" aria-label="Progress">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className={step === 1 ? "text-white" : ""}>Details</span>
          <span className={step === 2 ? "text-white" : ""}>Confirm</span>
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded">
          <div
            className={`h-1 bg-indigo-500 rounded transition-all duration-300 ${
              step === 1 ? "w-1/2" : "w-full"
            }`}
          />
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-200">First Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your first name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-200">Last Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your last name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-200">Email Address *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-200">Phone Number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {step === 1 ? (
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200"
          >
            Continue
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
              <div className="font-medium text-white mb-2">Order Summary</div>
              <div className="flex items-center justify-between">
                <span>1 × RSVP ticket</span>
                <span className="text-emerald-400">Free</span>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                No charges. You’ll receive an email confirmation.
              </div>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Confirm & Register"
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Lock className="w-3 h-3" />
              <span>Secure checkout • No payment required for RSVP</span>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
