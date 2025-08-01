"use client";

import { useTransition, useState } from "react";
import { registerAttendee } from "@/actions/attendees";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AttendeeRegistration } from "@/types/event";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email address"),
  phone: z.string().optional(),
  eventId: z.uuid(),
});

interface Props {
  eventId: string;
}

export default function RegisterForm({ eventId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const form = useForm<AttendeeRegistration>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      eventId,
    },
  });

  const onSubmit = async (data: AttendeeRegistration) => {
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
        setTimeout(() => {
          router.push(`/events/${eventId}/register/thanks`);
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
            "Complete Registration"
          )}
        </Button>
      </form>
    </Form>
  );
}
