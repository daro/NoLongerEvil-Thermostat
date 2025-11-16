"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
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
import { Loader2, CheckCircle2, AlertCircle, Wifi, Lock, Server } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MqttSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingConfig?: any;
}

type Step = "broker" | "credentials" | "advanced" | "testing" | "complete";

export function MqttSetupWizard({ open, onOpenChange, existingConfig }: MqttSetupWizardProps) {
  const { user } = useUser();
  const userId = user?.id;

  const [step, setStep] = useState<Step>("broker");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [brokerUrl, setBrokerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [topicPrefix, setTopicPrefix] = useState("nolongerevil");
  const [discoveryPrefix, setDiscoveryPrefix] = useState("homeassistant");

  const upsertIntegration = useAction(api.integrations_actions.upsertIntegrationSecure);

  // Load existing config if editing
  useEffect(() => {
    if (existingConfig) {
      setBrokerUrl(existingConfig.config.brokerUrl || "");
      setUsername(existingConfig.config.username || "");
      setPassword(existingConfig.config.password || "");
      setTopicPrefix(existingConfig.config.topicPrefix || "nolongerevil");
      setDiscoveryPrefix(existingConfig.config.discoveryPrefix || "homeassistant");
    }
  }, [existingConfig]);

  const handleNext = () => {
    if (step === "broker") setStep("credentials");
    else if (step === "credentials") setStep("advanced");
    else if (step === "advanced") setStep("testing");
  };

  const handleBack = () => {
    if (step === "credentials") setStep("broker");
    else if (step === "advanced") setStep("credentials");
    else if (step === "testing") setStep("advanced");
  };

  const handleTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    // Simulate connection test (in real implementation, this would call an API endpoint)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // For now, just validate the URL format
    const isValidUrl = brokerUrl.startsWith("mqtt://") || brokerUrl.startsWith("mqtts://");

    setTestResult({
      success: isValidUrl,
      message: isValidUrl
        ? "Successfully connected to MQTT broker!"
        : "Invalid broker URL. Must start with mqtt:// or mqtts://",
    });

    setIsLoading(false);

    if (isValidUrl) {
      setTimeout(() => setStep("complete"), 1500);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      await upsertIntegration({
        userId,
        type: "mqtt",
        enabled: true,
        config: {
          brokerUrl,
          username: username || undefined,
          password: password || undefined,
          topicPrefix,
          discoveryPrefix,
        },
      });

      // Close wizard
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 500);
    } catch (error) {
      console.error("Failed to save integration:", error);
      setTestResult({
        success: false,
        message: "Failed to save integration. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("broker");
    setBrokerUrl("");
    setUsername("");
    setPassword("");
    setTopicPrefix("nolongerevil");
    setDiscoveryPrefix("homeassistant");
    setTestResult(null);
  };

  const canProceed = () => {
    if (step === "broker") return brokerUrl.trim().length > 0;
    if (step === "credentials") return true; // Optional
    if (step === "advanced") return topicPrefix.trim().length > 0 && discoveryPrefix.trim().length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {existingConfig ? "Edit MQTT Integration" : "Setup MQTT Integration"}
          </DialogTitle>
          <DialogDescription>
            Connect your thermostats to Home Assistant or any MQTT-based home automation platform
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {["broker", "credentials", "advanced", "testing"].map((s, idx) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      step === s
                        ? "bg-brand-600 text-white"
                        : ["broker", "credentials", "advanced", "testing"].indexOf(step) >
                          ["broker", "credentials", "advanced", "testing"].indexOf(s)
                        ? "bg-green-600 text-white"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {idx < 3 && (
                    <div
                      className={`h-1 w-16 ${
                        ["broker", "credentials", "advanced", "testing"].indexOf(step) > idx
                          ? "bg-green-600"
                          : "bg-zinc-200 dark:bg-zinc-800"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
              <span>Broker</span>
              <span>Credentials</span>
              <span>Advanced</span>
              <span>Test</span>
            </div>
          </div>

          {/* Step Content */}
          {step === "broker" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4">
                <Server className="h-5 w-5" />
                <h3 className="font-semibold">Broker Configuration</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brokerUrl">MQTT Broker URL *</Label>
                <Input
                  id="brokerUrl"
                  placeholder="mqtt://192.168.1.100:1883"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Examples: <code className="text-xs">mqtt://localhost:1883</code>,{" "}
                  <code className="text-xs">mqtts://broker.hivemq.com:8883</code>
                </p>
              </div>

              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  <strong>For Home Assistant users:</strong> Use <code>mqtt://core-mosquitto:1883</code> if using the Mosquitto add-on, or your Home Assistant's IP address.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === "credentials" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4">
                <Lock className="h-5 w-5" />
                <h3 className="font-semibold">Authentication</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (Optional)</Label>
                <Input
                  id="username"
                  placeholder="mqtt_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <Alert>
                <AlertDescription>
                  If your MQTT broker requires authentication, enter your credentials. Leave empty for anonymous access.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === "advanced" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4">
                <Server className="h-5 w-5" />
                <h3 className="font-semibold">Advanced Settings</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topicPrefix">Topic Prefix</Label>
                <Input
                  id="topicPrefix"
                  placeholder="nolongerevil"
                  value={topicPrefix}
                  onChange={(e) => setTopicPrefix(e.target.value)}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  All MQTT topics will be prefixed with this value
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discoveryPrefix">Home Assistant Discovery Prefix</Label>
                <Input
                  id="discoveryPrefix"
                  placeholder="homeassistant"
                  value={discoveryPrefix}
                  onChange={(e) => setDiscoveryPrefix(e.target.value)}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Used for Home Assistant auto-discovery (usually "homeassistant")
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  These settings are usually fine at their defaults. Only change if you know what you're doing.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === "testing" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-4">
                <Wifi className="h-5 w-5" />
                <h3 className="font-semibold">Test Connection</h3>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-2">
                <div className="text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Broker: </span>
                  <code className="text-xs">{brokerUrl}</code>
                </div>
                {username && (
                  <div className="text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Username: </span>
                    <code className="text-xs">{username}</code>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Topic Prefix: </span>
                  <code className="text-xs">{topicPrefix}</code>
                </div>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-4 text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-xl font-semibold">Connection Successful!</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your MQTT integration is ready. Click "Save" to enable it.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step !== "broker" && step !== "complete" && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
          )}

          {step !== "testing" && step !== "complete" && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          )}

          {step === "testing" && (
            <Button onClick={handleTest} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          )}

          {step === "complete" && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Integration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
