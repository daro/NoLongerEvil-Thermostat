'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Invite {
  _id: string;
  email: string;
  status: string;
  invitedAt: number;
  expiresAt: number;
  permissions: string[];
}

interface DeviceInvitesListProps {
  serial: string;
  onCountChange?: (count: number) => void;
}

export function DeviceInvitesList({ serial, onCountChange }: DeviceInvitesListProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, [serial]);

  const fetchInvites = async () => {
    try {
      const response = await fetch(`/api/shares?serial=${serial}`);
      const data = await response.json();
      const allInvites = data.invites || [];
      setInvites(allInvites);

      // Calculate pending invites count
      const pendingCount = allInvites.filter(
        (inv: Invite) => inv.status === 'pending' || inv.status === 'expired'
      ).length;

      if (onCountChange) {
        onCountChange(pendingCount);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
      if (onCountChange) {
        onCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (inviteId: string) => {
    setResending(inviteId);
    try {
      const response = await fetch(`/api/shares/resend/${inviteId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      await fetchInvites();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setResending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Filter to only show pending and expired invites (exclude accepted)
  const pendingInvites = invites.filter(
    (invite) => invite.status === 'pending' || invite.status === 'expired'
  );

  // Don't render anything if no pending invites
  if (pendingInvites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pendingInvites.map((invite) => {
        const isExpired = invite.status === 'expired';
        const isPending = invite.status === 'pending';

        return (
          <div
            key={invite._id}
            className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{invite.email}</p>
                <p className="text-xs text-zinc-500">
                  Sent {new Date(invite.invitedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-zinc-500">
                  {isExpired && 'Expired'}
                  {isPending && `Expires ${new Date(invite.expiresAt * 1000).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isExpired && (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend(invite._id)}
                      disabled={resending === invite._id}
                    >
                      {resending === invite._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                  </>
                )}
                {isPending && <Clock className="h-4 w-4 text-amber-600" />}
              </div>
            </div>
            <div className="flex gap-2">
              {invite.permissions.map((perm) => (
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
          </div>
        );
      })}
    </div>
  );
}
