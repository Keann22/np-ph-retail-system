'use client';

import Link from 'next/link';
import {
  Bell,
  Home,
  LineChart,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    auth.signOut();
  };
  
  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen bg-background">Loading...</div>
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-sidebar md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
              <Logo className="h-6 w-6" />
              <span className="font-headline">RetailFlow</span>
            </Link>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/orders"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <ShoppingCart className="h-4 w-4" />
                Orders
                <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  6
                </Badge>
              </Link>
              <Link
                href="/dashboard/products"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Package className="h-4 w-4" />
                Products
              </Link>
              <Link
                href="/dashboard/customers"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Users className="h-4 w-4" />
                Customers
              </Link>
              <Link
                href="/dashboard/reports"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LineChart className="h-4 w-4" />
                Reports
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground mb-4"
                >
                  <Logo className="h-6 w-6" />
                  <span className="sr-only">RetailFlow</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/orders"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    6
                  </Badge>
                </Link>
                <Link
                  href="/dashboard/products"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Package className="h-5 w-5" />
                  Products
                </Link>
                <Link
                  href="/dashboard/customers"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Users className="h-5 w-5" />
                  Customers
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <LineChart className="h-5 w-5" />
                  Reports
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Header content can go here, e.g. search bar */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  {user.photoURL ? (
                    <AvatarImage src={user.photoURL} alt="User avatar" />
                  ) : (
                    <AvatarFallback>
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
