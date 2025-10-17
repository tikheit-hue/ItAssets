
"use client";

import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import { useRouter, redirect } from 'next/navigation';
import LandingPageContent from '@/app/(main)/landing/page';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      redirect('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
    );
  }

  return <LandingPageContent />;
}
