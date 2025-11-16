"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Settings2, Key, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";

// Import the existing page contents
import dynamic from 'next/dynamic';

// Dynamically import the contents to avoid SSR issues
const ApiKeysContent = dynamic(() => import('../dashboard/api-keys/page').then(mod => ({ default: mod.default })), { ssr: false });
const IntegrationsContent = dynamic(() => import('../dashboard/integrations/page').then(mod => ({ default: mod.default })), { ssr: false });

export default function SettingsPage() {
  return (
    <>
      <SignedIn>
        <SettingsContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/settings" />
      </SignedOut>
    </>
  );
}

type Tab = "general" | "api-keys" | "integrations";

function SettingsContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Link href="/dashboard">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage your account preferences
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === "general"
                ? "surface text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("api-keys")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === "api-keys"
                ? "surface text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Key className="h-4 w-4" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === "integrations"
                ? "surface text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Plug className="h-4 w-4" />
            Integrations
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* General Settings Placeholder */}
            <div className="surface p-6">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Account Preferences
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                General account settings coming soon.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === "api-keys" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ApiKeysContent />
          </motion.div>
        )}

        {activeTab === "integrations" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <IntegrationsContent />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
