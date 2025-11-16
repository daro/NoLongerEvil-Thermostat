"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useThermostat, type DeviceData } from "@/lib/store";
import { ShareDeviceForm } from "./share-device-form";
import { DeviceSharesList } from "./device-shares-list";
import { DeviceInvitesList } from "./device-invites-list";

interface ThermostatSettingsDialogProps {
  device: DeviceData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThermostatSettingsDialog({
  device,
  open,
  onOpenChange,
}: ThermostatSettingsDialogProps) {
  const setTemperatureScale = useThermostat((s) => s.setTemperatureScale);
  const setDeviceName = useThermostat((s) => s.setDeviceName);
  const setTemperatureLock = useThermostat((s) => s.setTemperatureLock);
  const deleteDevice = useThermostat((s) => s.deleteDevice);

  const [isUpdating, setIsUpdating] = useState(false);
  const [deviceName, setDeviceName_local] = useState(device.name || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Temperature lock state
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockPin, setLockPin] = useState("");
  const [lockLowTemp, setLockLowTemp] = useState(
    device.temperatureLockLow?.toString() || (device.temperatureScale === "F" ? "50" : "10")
  );
  const [lockHighTemp, setLockHighTemp] = useState(
    device.temperatureLockHigh?.toString() || (device.temperatureScale === "F" ? "90" : "32")
  );

  const handleScaleChange = async (e: React.MouseEvent, scale: "C" | "F") => {
    e.preventDefault();
    e.stopPropagation();

    if (scale === device.temperatureScale) return;

    setIsUpdating(true);
    try {
      await setTemperatureScale(scale, device.serial);
      onOpenChange(false);
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
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete device:", error);
      setIsUpdating(false);
    }
  };

  const handleLockEnable = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(lockPin)) {
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
      await setTemperatureLock(device.serial, true, lockPin, lowTemp, highTemp);
      setShowLockForm(false);
      setLockPin("");
    } catch (error) {
      console.error("Failed to enable temperature lock:", error);
    } finally {
      setIsUpdating(false);
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

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md z-50 flex items-center justify-center overflow-y-auto p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenChange(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
              }}
              className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/20 text-white transition-colors duration-200 shadow-lg cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            <Card className="border-brand-200/60 dark:border-brand-900/50 bg-white/95 dark:bg-zinc-950/60 backdrop-blur shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Thermostat Settings
                </CardTitle>
                <CardDescription className="text-sm text-zinc-600 dark:text-zinc-300">
                  Configure settings for {device.name || device.serial}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="sharing">Sharing</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-6 mt-4">
                    {/* Device Name */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Device Name
                      </h3>
                      <div className="flex gap-2">
                        <Input
                          value={deviceName}
                          onChange={(e) => setDeviceName_local(e.target.value)}
                          placeholder="Enter device name"
                          disabled={isUpdating}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleNameSave(e as any);
                            }
                          }}
                        />
                        <Button
                          onClick={handleNameSave}
                          disabled={isUpdating || !deviceName.trim() || deviceName.trim() === device.name}
                          variant="outline"
                        >
                          Save
                        </Button>
                      </div>
                    </div>

                    {/* Temperature Scale */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Temperature Scale
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant={device.temperatureScale === "C" ? "default" : "outline"}
                          onClick={(e) => handleScaleChange(e, "C")}
                          disabled={isUpdating || device.temperatureScale === "C"}
                          className="w-full"
                        >
                          Celsius (°C)
                        </Button>
                        <Button
                          variant={device.temperatureScale === "F" ? "default" : "outline"}
                          onClick={(e) => handleScaleChange(e, "F")}
                          disabled={isUpdating || device.temperatureScale === "F"}
                          className="w-full"
                        >
                          Fahrenheit (°F)
                        </Button>
                      </div>
                    </div>

                    {/* Temperature Lock */}
                    {device.isOwner !== false && (
                      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Temperature Lock
                        </h3>
                        {device.temperatureLock ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Lock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                                <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                                  Temperature lock is enabled
                                </p>
                              </div>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Allowed range: {device.temperatureLockLow}° - {device.temperatureLockHigh}°{device.temperatureScale}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={handleLockDisable}
                              disabled={isUpdating}
                              className="w-full"
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
                            className="w-full"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Lock Thermostat
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              Set a 4-digit PIN and temperature range to restrict thermostat access.
                            </p>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                4-Digit PIN
                              </label>
                              <Input
                                type="password"
                                inputMode="numeric"
                                pattern="\d{4}"
                                maxLength={4}
                                value={lockPin}
                                onChange={(e) => setLockPin(e.target.value.replace(/\D/g, ""))}
                                placeholder="Enter 4-digit PIN"
                                disabled={isUpdating}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  Min Temp (°{device.temperatureScale})
                                </label>
                                <Input
                                  type="number"
                                  value={lockLowTemp}
                                  onChange={(e) => setLockLowTemp(e.target.value)}
                                  disabled={isUpdating}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  Max Temp (°{device.temperatureScale})
                                </label>
                                <Input
                                  type="number"
                                  value={lockHighTemp}
                                  onChange={(e) => setLockHighTemp(e.target.value)}
                                  disabled={isUpdating}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowLockForm(false);
                                  setLockPin("");
                                }}
                                disabled={isUpdating}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleLockEnable}
                                disabled={isUpdating || lockPin.length !== 4}
                              >
                                Enable Lock
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete Device */}
                    {device.isOwner !== false && (
                      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
                          Danger Zone
                        </h3>
                        {!showDeleteConfirm ? (
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowDeleteConfirm(true);
                            }}
                            disabled={isUpdating}
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Thermostat
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              Are you sure? This action cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowDeleteConfirm(false);
                                }}
                                disabled={isUpdating}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isUpdating}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show "Shared by" banner if not owner */}
                    {device.isOwner === false && device.sharedBy && (
                      <div className="p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 rounded-lg">
                        <p className="text-sm text-brand-700 dark:text-brand-300">
                          This thermostat is shared with you by <strong>{device.sharedBy}</strong>
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sharing" className="space-y-6 mt-4">
                    {device.isOwner !== false ? (
                      <>
                        {/* Share Device Form */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Share with Someone
                          </h3>
                          <ShareDeviceForm serial={device.serial} />
                        </div>

                        {/* Active Shares */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Users with Access
                          </h3>
                          <DeviceSharesList serial={device.serial} />
                        </div>

                        {/* Pending Invites */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Pending Invitations
                          </h3>
                          <DeviceInvitesList serial={device.serial} />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-zinc-500">
                          You don't have permission to manage sharing for this device.
                        </p>
                        {device.sharedBy && (
                          <p className="text-sm text-zinc-500 mt-2">
                            Contact <strong>{device.sharedBy}</strong> to manage access.
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
