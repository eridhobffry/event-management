import { StackServerApp, StackClientApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  // Removed baseUrl to use Stack Auth's default hosted service
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || "internal",
  publishableClientKey:
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || "internal",
});
