"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";

interface GenerateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyGenerated: (key: string, name: string) => void;
}

const AVAILABLE_SCOPES = [
  { value: "read", label: "Read", description: "View device status and data" },
  { value: "write", label: "Write", description: "Update device settings" },
  { value: "control", label: "Control", description: "Full device control (temperature, modes)" },
  { value: "manage", label: "Manage", description: "Manage device ownership and sharing" },
];

export function GenerateApiKeyDialog({ open, onOpenChange, onKeyGenerated }: GenerateApiKeyDialogProps) {
  const { user } = useUser();
  const userId = user?.id;

  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read", "write", "control"]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's devices for serial selection
  const devices = useQuery(
    api.users.listUserDevices,
    userId ? { userId } : "skip"
  );

  const generateApiKey = useMutation(api.apiKeys.generateApiKey);

  const handleToggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleToggleSerial = (serial: string) => {
    setSelectedSerials((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial]
    );
  };

  const handleGenerate = async () => {
    if (!userId || !name.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateApiKey({
        userId,
        name: name.trim(),
        permissions: {
          serials: selectedSerials,
          scopes: selectedScopes,
        },
      });

      if (result?.key) {
        onKeyGenerated(result.key, name.trim());
        // Reset form
        setName("");
        setSelectedScopes(["read", "write", "control"]);
        setSelectedSerials([]);
      }
    } catch (error) {
      console.error("Failed to generate API key:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = name.trim().length > 0 && selectedScopes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate New API Key</DialogTitle>
          <DialogDescription>
            Create an API key for programmatic access to your devices. The key will only be shown once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Key Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Home Assistant Integration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              A descriptive name to help you identify this key
            </p>
          </div>

          {/* Scopes */}
          <div className="space-y-3">
            <Label>Permissions (Scopes) *</Label>
            <div className="space-y-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <div key={scope.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={`scope-${scope.value}`}
                    checked={selectedScopes.includes(scope.value)}
                    onCheckedChange={() => handleToggleScope(scope.value)}
                    disabled={isGenerating}
                  />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <label
                      htmlFor={`scope-${scope.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {scope.label}
                    </label>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {scope.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selectedScopes.length === 0 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                At least one scope is required
              </p>
            )}
          </div>

          {/* Device Restrictions */}
          <div className="space-y-3">
            <Label>Device Access (Optional)</Label>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Restrict this key to specific devices. Leave empty for access to all devices.
            </p>
            {devices && devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div key={device.serial} className="flex items-center space-x-3">
                    <Checkbox
                      id={`device-${device.serial}`}
                      checked={selectedSerials.includes(device.serial)}
                      onCheckedChange={() => handleToggleSerial(device.serial)}
                      disabled={isGenerating}
                    />
                    <label
                      htmlFor={`device-${device.serial}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {device.serial}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No devices linked yet
              </p>
            )}
          </div>

          {/* Summary */}
          {canGenerate && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
              <h4 className="text-sm font-semibold mb-2">Summary</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Name: </span>
                  <span className="font-medium">{name}</span>
                </div>
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Scopes: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedScopes.map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400">Devices: </span>
                  {selectedSerials.length === 0 ? (
                    <span className="font-medium">All devices</span>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSerials.map((serial) => (
                        <Badge key={serial} variant="outline" className="text-xs">
                          {serial}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
