'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Loader2, Mail, Check } from 'lucide-react';

interface ShareDeviceFormProps {
  serial: string;
  onSuccess?: () => void;
}

export function ShareDeviceForm({ serial, onSuccess }: ShareDeviceFormProps) {
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['view']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/shares/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), serial, permissions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send invitation');
      }

      setSuccess(true);
      setEmail('');
      setPermissions(['view']);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <div className="relative mt-1">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Enter the email address of the person you want to share with
        </p>
      </div>

      <div>
        <Label>Permissions</Label>
        <div className="space-y-3 mt-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex-1">
              <p className="text-sm font-medium">View</p>
              <p className="text-xs text-zinc-500">Always enabled - allows viewing thermostat status</p>
            </div>
            <Switch checked={true} disabled />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-medium">Control</p>
              <p className="text-xs text-zinc-500">Change temperature & system modes</p>
            </div>
            <Switch
              checked={permissions.includes('control')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setPermissions([...permissions, 'control']);
                } else {
                  setPermissions(permissions.filter(p => p !== 'control'));
                }
              }}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-600 dark:text-green-400">Invitation sent successfully!</p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Invitation
      </Button>
    </form>
  );
}
