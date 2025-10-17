
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Users, BarChart2, Settings, ArrowRight, ShieldCheck, Component, Award, AppWindow } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: <Package className="h-8 w-8 text-primary" />,
    title: 'Asset Management',
    description: 'Keep a detailed inventory of all your company hardware, from laptops to servers.',
  },
  {
    icon: <AppWindow className="h-8 w-8 text-primary" />,
    title: 'Software Licensing',
    description: 'Track software licenses, renewals, and assignments to employees or devices.',
  },
  {
    icon: <Component className="h-8 w-8 text-primary" />,
    title: 'Consumables',
    description: 'Manage stock levels of consumable items like keyboards, mice, and cables.',
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Employee Tracking',
    description: 'Manage employee records and easily assign or unassign assets and licenses.',
  },
  {
    icon: <Award className="h-8 w-8 text-primary" />,
    title: 'Awards & Recognition',
    description: 'Formally recognize employee achievements with customizable award certificates.',
  },
  {
    icon: <BarChart2 className="h-8 w-8 text-primary" />,
    title: 'Insightful Reports',
    description: 'Generate detailed reports on asset lifecycle, inventory, and employee assignments.',
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-foreground">
                AssetGuard
            </h1>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow">
        <section className="text-center py-20 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-foreground">
              The Modern Way to Manage Your Assets
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              AssetGuard gives you a complete, real-time overview of your company's physical and digital assets. Simple, powerful, and secure.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/auth/signup">
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 lg:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold font-headline">Powerful Features, Simple Interface</h3>
              <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
                Everything you need to take control of your asset inventory.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardHeader className="items-center">
                    {feature.icon}
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AssetGuard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
