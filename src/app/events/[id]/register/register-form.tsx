"use client";

import { useTransition } from "react";
import { registerAttendee } from "@/actions/attendees";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AttendeeRegistration } from "@/types/event";

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

  const { register, handleSubmit } = form;

  const onSubmit = async (data: AttendeeRegistration) => {
    startTransition(async () => {
      const res = await registerAttendee({
        ...data,
      });
      if (res?.errors || res?.message) {
        toast.error(res.message || "Registration failed");
      }
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-zinc-200">
            First Name *
          </Label>
          <Input
            {...register("firstName")}
            placeholder="Enter your first name"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-zinc-200">
            Last Name *
          </Label>
          <Input
            {...register("lastName")}
            placeholder="Enter your last name"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-zinc-200">
          Email Address *
        </Label>
        <Input
          {...register("email")}
          type="email"
          placeholder="Enter your email address"
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-zinc-200">
          Phone Number
        </Label>
        <Input
          {...register("phone")}
          type="tel"
          placeholder="Enter your phone number"
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Registering..." : "Complete Registration"}
      </Button>
    </form>
  );
}
