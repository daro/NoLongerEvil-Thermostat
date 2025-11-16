'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AcceptSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      // Redirect to sign in with return URL
      router.push(`/auth/login?redirect=/shares/accept/${token}`);
      return;
    }

    acceptInvitation();
  }, [isLoaded, userId, token]);

  const acceptInvitation = async () => {
    try {
      const response = await fetch(`/api/shares/accept/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to accept invitation');
      }

      setStatus('success');
      setMessage('You now have access to this thermostat!');
      setDeviceSerial(data.serial);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (!isLoaded || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Accepting Invitation...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait while we process your invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <Loader2 className="h-12 w-12 animate-spin text-brand-600 mx-auto" />
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg mb-4">{message}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Redirecting to dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-lg mb-4">{message}</p>
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
