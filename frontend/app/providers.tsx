"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme-provider";
import { QueryProvider } from "@/lib/query-client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider>
      <ConvexProvider client={convex}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}

