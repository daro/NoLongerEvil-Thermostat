'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';

interface Share {
  _id: string;
  sharedWithUserId: string;
  sharedWithEmail: string;
  permissions: string[];
  createdAt: number;
}

interface DeviceSharesListProps {
  serial: string;
  onCountChange?: (count: number) => void;
}

export function DeviceSharesList({ serial, onCountChange }: DeviceSharesListProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchShares();
  }, [serial]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(shares.length);
    }
  }, [shares.length, onCountChange]);

  const fetchShares = async () => {
    try {
      const response = await fetch(`/api/shares?serial=${serial}`);
      const data = await response.json();
      setShares(data.shares || []);
    } catch (error) {
      console.error('Failed to fetch shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke access for this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke access');
      }

      await fetchShares();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to revoke access');
    }
  };

  const handleStartEdit = (share: Share) => {
    setEditingId(share._id);
    setEditPermissions([...share.permissions]);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPermissions([]);
  };

  const handleSaveEdit = async (shareId: string) => {
    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editPermissions }),
      });

      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }

      await fetchShares();
      setEditingId(null);
      setEditPermissions([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update permissions');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Don't render anything if no shares
  if (shares.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {shares.map((share) => (
        <div
          key={share._id}
          className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-sm">{share.sharedWithEmail}</p>
              <p className="text-xs text-zinc-500">
                Shared {new Date(share.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-1">
              {editingId === share._id ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSaveEdit(share._id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(share)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(share._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {editingId === share._id ? (
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">View</p>
                  <p className="text-xs text-zinc-500">Always enabled</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium">Control</p>
                  <p className="text-xs text-zinc-500">Change temperature & modes</p>
                </div>
                <Switch
                  checked={editPermissions.includes('control')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setEditPermissions([...editPermissions, 'control']);
                    } else {
                      setEditPermissions(editPermissions.filter(p => p !== 'control'));
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {share.permissions.map((perm) => (
                <span
                  key={perm}
                  className={
                    perm === 'view'
                      ? "px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium"
                      : "px-2 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-medium"
                  }
                >
                  {perm}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
