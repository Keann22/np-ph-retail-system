'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading, userError } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('keneth@owner.com');
  const [password, setPassword] = useState('password123');
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
    if(userError) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: userError.message,
        });
    }
  }, [user, isUserLoading, router, userError, toast]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Email and password are required.",
        });
        return;
    }
    initiateEmailSignIn(auth, email, password);
  };
  
  if (isUserLoading || (!isUserLoading && user)) {
    return <div className="flex items-center justify-center min-h-screen bg-background">Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <Logo className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">RetailFlow</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="owner@retailflow.app" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
