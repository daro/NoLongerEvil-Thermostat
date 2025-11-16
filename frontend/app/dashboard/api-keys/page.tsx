"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Key, Copy, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { GenerateApiKeyDialog } from "@/components/generate-api-key-dialog";
import { ApiKeyDisplayDialog } from "@/components/api-key-display-dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ApiKeysPage() {
  return (
    <>
      <SignedIn>
        <ApiKeysContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/dashboard/api-keys" />
      </SignedOut>
    </>
  );
}

function ApiKeysContent() {
  const { user } = useUser();
  const userId = user?.id;

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [displayDialogOpen, setDisplayDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; name: string } | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Fetch API keys
  const apiKeys = useQuery(
    api.apiKeys.listApiKeys,
    userId ? { userId } : "skip"
  );

  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);

  const handleKeyGenerated = (key: string, name: string) => {
    setGeneratedKey({ key, name });
    setGenerateDialogOpen(false);
    setDisplayDialogOpen(true);
  };

  const handleCopyKey = async (keyPreview: string) => {
    await navigator.clipboard.writeText(keyPreview);
    setCopiedKeyId(keyPreview);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!userId) return;
    try {
      await revokeApiKey({ userId, keyId: keyId as any });
      setDeleteKeyId(null);
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case "read":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "write":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "control":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "manage":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage API keys for programmatic access to your thermostats
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {apiKeys?.length || 0} API key{apiKeys?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate New Key
        </Button>
      </div>

      {!apiKeys || apiKeys.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              No API Keys Yet
            </CardTitle>
            <CardDescription>
              Generate your first API key to start using the developer API or enable integrations like MQTT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setGenerateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      {key.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Created {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` • Last used ${formatDate(key.lastUsedAt)}`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteKeyId(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key Preview */}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      API Key
                    </label>
                    <div className="flex gap-2">
                      <code className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-mono">
                        {key.preview}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyKey(key.preview)}
                      >
                        {copiedKeyId === key.preview ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      The full key was only shown once when created. This is a preview.
                    </p>
                  </div>

                  {/* Permissions */}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Scopes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {key.permissions.scopes.map((scope) => (
                        <Badge key={scope} className={getScopeColor(scope)}>
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Device Restrictions */}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Device Access
                    </label>
                    {key.permissions.serials.length === 0 ? (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        All devices (no restrictions)
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {key.permissions.serials.map((serial) => (
                          <Badge key={serial} variant="outline">
                            {serial}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expiration */}
                  {key.expiresAt && (
                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                        Expires
                      </label>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {formatDate(key.expiresAt)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <GenerateApiKeyDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onKeyGenerated={handleKeyGenerated}
      />

      {/* Display Dialog (shows generated key once) */}
      {generatedKey && (
        <ApiKeyDisplayDialog
          open={displayDialogOpen}
          onOpenChange={setDisplayDialogOpen}
          apiKey={generatedKey.key}
          keyName={generatedKey.name}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Applications using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && handleDeleteKey(deleteKeyId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
