"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApiKeyDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  keyName: string;
}

export function ApiKeyDisplayDialog({ open, onOpenChange, apiKey, keyName }: ApiKeyDisplayDialogProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setCopied(false);
      setRevealed(true);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>API Key Generated Successfully</DialogTitle>
          <DialogDescription>
            Save this key in a secure location. You won't be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Important:</strong> This is the only time you'll see this key. Make sure to copy it now and store it securely.
            </AlertDescription>
          </Alert>

          {/* Key Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Key Name
            </label>
            <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm">
              {keyName}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                API Key
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevealed(!revealed)}
                className="h-8 text-xs"
              >
                {revealed ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-3 bg-zinc-900 dark:bg-zinc-950 text-green-400 rounded-md text-sm font-mono break-all border border-zinc-700 dark:border-zinc-800">
                {revealed ? apiKey : "•".repeat(apiKey.length)}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              How to Use
            </label>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">REST API</p>
                <code className="text-xs block bg-zinc-900 dark:bg-zinc-950 text-zinc-300 p-2 rounded font-mono">
                  Authorization: Bearer {revealed ? apiKey : "YOUR_API_KEY"}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">cURL Example</p>
                <code className="text-xs block bg-zinc-900 dark:bg-zinc-950 text-zinc-300 p-2 rounded font-mono break-all">
                  curl -H "Authorization: Bearer {revealed ? apiKey : "YOUR_API_KEY"}" \<br />
                  &nbsp;&nbsp;http://localhost:3001/api/devices
                </code>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  See the{" "}
                  <a
                    href="/docs/api"
                    target="_blank"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    API documentation
                  </a>{" "}
                  for more examples
                </p>
              </div>
            </div>
          </div>

          {/* Security Tips */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Security Best Practices
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• Never commit API keys to version control</li>
              <li>• Store keys in environment variables or secure vaults</li>
              <li>• Rotate keys periodically (every 90 days recommended)</li>
              <li>• Use different keys for different applications</li>
              <li>• Revoke unused or compromised keys immediately</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            I've Saved My Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
