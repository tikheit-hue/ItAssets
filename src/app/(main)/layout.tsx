
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, LogOut } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const tabList = [
    { value: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { value: 'assets', label: 'Assets', href: '/assets' },
    { value: 'employees', label: 'Employees', href: '/employees' },
    { value: 'vendors', label: 'Vendors', href: '/vendors' },
    { value: 'software', label: 'Software', href: '/software' },
    { value: 'consumables', label: 'Consumables', href: '/consumables' },
    { value: 'awards', label: 'Awards', href: '/awards' },
    { value: 'labeler', label: 'Labeler', href: '/labeler' },
    { value: 'reports', label: 'Reports', href: '/reports' },
    { value: 'settings', label: 'Settings', href: '/settings' },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = pathname.split('/')[1] || 'dashboard';

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/auth/login');
  };

  return (
    <main className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
            <header className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold font-headline text-foreground">
                    AssetGuard
                </h1>
                </div>
                <Separator
                orientation="vertical"
                className="h-6 hidden md:block"
                />
                <div className="hidden md:block">
                    <div className="flex items-center gap-1">
                        {tabList.map((tab) => (
                        <Button key={tab.value} variant={activeTab === tab.value ? 'secondary' : 'ghost'} asChild>
                            <Link href={tab.href} >{tab.label}</Link>
                        </Button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
                </span>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign Out</span>
                </Button>
            </div>
            </header>
            <div className="md:hidden">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex items-center gap-1">
                    {tabList.map((tab) => (
                        <Button key={tab.value} variant={activeTab === tab.value ? 'secondary' : 'ghost'} asChild>
                            <Link href={tab.href}>{tab.label}</Link>
                        </Button>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            </div>
        </div>
        </div>

        <div className="flex-grow">
            {children}
        </div>

        <footer className="text-center mt-auto mb-8 text-muted-foreground text-sm">
        <Separator className="my-6 container" />
        <p>
            &copy; {new Date().getFullYear()} AssetGuard. A modern solution for
            asset management. (v{process.env.APP_VERSION})
        </p>
        </footer>
    </main>
  );
}
