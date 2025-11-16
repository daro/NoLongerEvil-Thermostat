"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useThermostat } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, Lock, Unlock, Settings2, Users, Thermometer } from "lucide-react";
import { ShareDeviceForm } from "@/components/share-device-form";
import { DeviceSharesList } from "@/components/device-shares-list";
import { DeviceInvitesList } from "@/components/device-invites-list";
import { useState } from "react";

export default function SettingsPage() {
  return (
    <>
      <SignedIn>
        <SettingsContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/dashboard" />
      </SignedOut>
    </>
  );
}

function SettingsContent() {
  const params = useParams<{ serial: string }>();
  const router = useRouter();
  const rawSerial = params?.serial;
  const serial =
    typeof rawSerial === "string"
      ? decodeURIComponent(rawSerial).trim()
      : Array.isArray(rawSerial)
      ? decodeURIComponent(rawSerial[0] ?? "").trim()
      : "";

  const devices = useThermostat((s) => s.devices);
  const fetchStatus = useThermostat((s) => s.fetchStatus);
  const isLoading = useThermostat((s) => s.isLoading);
  const setTemperatureScale = useThermostat((s) => s.setTemperatureScale);
  const setDeviceName = useThermostat((s) => s.setDeviceName);
  const setTemperatureLock = useThermostat((s) => s.setTemperatureLock);
  const deleteDevice = useThermostat((s) => s.deleteDevice);

  const device = devices.find((d) => d.serial === serial);

  // Fetch device data on mount if not already loaded
  useEffect(() => {
    if (serial && !device && !isLoading) {
      fetchStatus(serial);
    }
  }, [serial, device, isLoading, fetchStatus]);

  const [activeTab, setActiveTab] = useState<"general" | "sharing">("general");
  const [isUpdating, setIsUpdating] = useState(false);
  const [sharesCount, setSharesCount] = useState(0);
  const [invitesCount, setInvitesCount] = useState(0);
  const [deviceName, setDeviceName_local] = useState(device?.name || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Temperature lock state
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockPin, setLockPin] = useState(["", "", "", ""]);
  const [lockLowTemp, setLockLowTemp] = useState(
    device?.temperatureLockLow?.toString() || (device?.temperatureScale === "F" ? "50" : "10")
  );
  const [lockHighTemp, setLockHighTemp] = useState(
    device?.temperatureLockHigh?.toString() || (device?.temperatureScale === "F" ? "90" : "32")
  );

  useEffect(() => {
    if (device) {
      setDeviceName_local(device.name || "");
      setLockLowTemp(device.temperatureLockLow?.toString() || (device.temperatureScale === "F" ? "50" : "10"));
      setLockHighTemp(device.temperatureLockHigh?.toString() || (device.temperatureScale === "F" ? "90" : "32"));
    }
  }, [device]);

  if (!serial) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-zinc-600 dark:text-zinc-400">Invalid device serial.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!device) {
    if (isLoading) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-10 flex justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Loading device...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-zinc-600 dark:text-zinc-400">Device not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const handleScaleChange = async (e: React.MouseEvent, scale: "C" | "F") => {
    e.preventDefault();
    e.stopPropagation();

    if (scale === device.temperatureScale) return;

    setIsUpdating(true);
    try {
      await setTemperatureScale(scale, device.serial);
    } catch (error) {
      console.error("Failed to update temperature scale:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNameSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const trimmedName = deviceName.trim();
    if (!trimmedName || trimmedName === device.name) return;

    setIsUpdating(true);
    try {
      await setDeviceName(trimmedName, device.serial);
    } catch (error) {
      console.error("Failed to update device name:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsUpdating(true);
    try {
      await deleteDevice(device.serial);
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to delete device:", error);
      setIsUpdating(false);
    }
  };

  const handleLockEnable = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const pinString = lockPin.join("");
    if (!/^\d{4}$/.test(pinString)) {
      alert("PIN must be exactly 4 digits");
      return;
    }

    const lowTemp = parseFloat(lockLowTemp);
    const highTemp = parseFloat(lockHighTemp);

    if (isNaN(lowTemp) || isNaN(highTemp)) {
      alert("Please enter valid temperatures");
      return;
    }

    if (lowTemp >= highTemp) {
      alert("Low temperature must be less than high temperature");
      return;
    }

    setIsUpdating(true);
    try {
      await setTemperatureLock(device.serial, true, pinString, lowTemp, highTemp);
      setShowLockForm(false);
      setLockPin(["", "", "", ""]);
    } catch (error) {
      console.error("Failed to enable temperature lock:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...lockPin];
    newPin[index] = value.slice(-1);
    setLockPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !lockPin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleLockDisable = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsUpdating(true);
    try {
      await setTemperatureLock(device.serial, false);
    } catch (error) {
      console.error("Failed to disable temperature lock:", error);
    } finally {
      setIsUpdating(false);
    }
  };

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
              <Link href={`/dashboard/${serial}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {device.name || device.serial}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "general"
                ? "surface text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("sharing")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "sharing"
                ? "surface text-brand-600 dark:text-brand-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Users className="h-4 w-4" />
            Sharing
          </button>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Device Name Card */}
            <div className="surface p-6">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Device Name
              </h3>
              <div className="flex gap-3">
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName_local(e.target.value)}
                  placeholder="Enter device name"
                  disabled={isUpdating}
                  className="flex-1 h-11"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSave(e as any);
                    }
                  }}
                />
                <Button
                  onClick={handleNameSave}
                  disabled={isUpdating || !deviceName.trim() || deviceName.trim() === device.name}
                  className="h-11 px-6"
                >
                  Save
                </Button>
              </div>
            </div>

            {/* Temperature Scale Card */}
            <div className="surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <Thermometer className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Temperature Scale
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={device.temperatureScale === "C" ? "default" : "outline"}
                  onClick={(e) => handleScaleChange(e, "C")}
                  disabled={isUpdating || device.temperatureScale === "C"}
                  className="h-12 text-base"
                >
                  Celsius (°C)
                </Button>
                <Button
                  variant={device.temperatureScale === "F" ? "default" : "outline"}
                  onClick={(e) => handleScaleChange(e, "F")}
                  disabled={isUpdating || device.temperatureScale === "F"}
                  className="h-12 text-base"
                >
                  Fahrenheit (°F)
                </Button>
              </div>
            </div>

            {/* Temperature Lock Card */}
            {device.isOwner !== false && (
              <div className="surface p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Temperature Lock
                  </h3>
                </div>
                {device.temperatureLock ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-400 dark:border-emerald-700 rounded-xl">
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                        Lock is enabled
                      </p>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        Allowed range: {device.temperatureLockLow}° - {device.temperatureLockHigh}°
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleLockDisable}
                      disabled={isUpdating}
                      className="w-full h-12"
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock Thermostat
                    </Button>
                  </div>
                ) : !showLockForm ? (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowLockForm(true);
                    }}
                    disabled={isUpdating}
                    className="w-full h-12"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Enable Temperature Lock
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Set a 4-digit PIN and temperature range to restrict thermostat access.
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        4-Digit PIN
                      </label>
                      <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3].map((index) => (
                          <input
                            key={index}
                            id={`pin-${index}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={lockPin[index]}
                            onChange={(e) => handlePinChange(index, e.target.value)}
                            onKeyDown={(e) => handlePinKeyDown(index, e)}
                            disabled={isUpdating}
                            className="w-14 h-14 text-center text-2xl font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 focus:border-transparent"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Min Temp (°)
                        </label>
                        <Input
                          type="number"
                          value={lockLowTemp}
                          onChange={(e) => setLockLowTemp(e.target.value)}
                          disabled={isUpdating}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Max Temp (°)
                        </label>
                        <Input
                          type="number"
                          value={lockHighTemp}
                          onChange={(e) => setLockHighTemp(e.target.value)}
                          disabled={isUpdating}
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowLockForm(false);
                          setLockPin(["", "", "", ""]);
                        }}
                        disabled={isUpdating}
                        className="h-11"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleLockEnable}
                        disabled={isUpdating || lockPin.some(digit => !digit)}
                        className="h-11"
                      >
                        Enable Lock
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Danger Zone Card */}
            {device.isOwner !== false && (
              <div className="surface p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-base font-semibold text-red-700 dark:text-red-400">
                    Danger Zone
                  </h3>
                </div>
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    disabled={isUpdating}
                    className="w-full h-12 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Thermostat
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      Are you sure? This action cannot be undone.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowDeleteConfirm(false);
                        }}
                        disabled={isUpdating}
                        className="h-11"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isUpdating}
                        className="h-11 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shared Device Banner */}
            {device.isOwner === false && device.sharedBy && (
              <div className="surface p-6">
                <p className="text-sm text-brand-700 dark:text-brand-300">
                  This thermostat is shared with you by <strong>{device.sharedBy}</strong>
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Sharing Tab */}
        {activeTab === "sharing" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {device.isOwner !== false ? (
              <>
                {/* Share Device Card */}
                <div className="surface p-6">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Share with Someone
                  </h3>
                  <ShareDeviceForm serial={device.serial} />
                </div>

                {/* Users with Access Card - Hidden wrapper, component renders its own card when it has data */}
                <div className={sharesCount === 0 ? 'hidden' : ''}>
                  <div className="surface p-6">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                      Users with Access
                    </h3>
                    <DeviceSharesList serial={device.serial} onCountChange={setSharesCount} />
                  </div>
                </div>

                {/* Pending Invites Card - Hidden wrapper, component renders its own card when it has data */}
                <div className={invitesCount === 0 ? 'hidden' : ''}>
                  <div className="surface p-6">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                      Pending Invitations
                    </h3>
                    <DeviceInvitesList serial={device.serial} onCountChange={setInvitesCount} />
                  </div>
                </div>
              </>
            ) : (
              <div className="surface p-12 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  You don't have permission to manage sharing for this device.
                </p>
                {device.sharedBy && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                    Contact <strong>{device.sharedBy}</strong> to manage access.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
