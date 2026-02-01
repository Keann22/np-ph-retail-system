'use client';

import Link from 'next/link';
import {
  Archive,
  ArrowDownUp,
  Bell,
  Building,
  ChevronDown,
  Home,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [openInventory, setOpenInventory] = useState(false);

  // The pending orders query that was causing permission errors has been removed for stability.
  // The badge feature can be re-introduced later with a more robust data fetching strategy.
  const pendingOrdersCount = null;

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart, badge: pendingOrdersCount && pendingOrdersCount > 0 ? pendingOrdersCount : null },
    { href: '/dashboard/products', label: 'Products', icon: Package },
    { 
        id: 'inventory',
        label: 'Inventory Management', 
        icon: Archive,
        isOpen: openInventory,
        setIsOpen: setOpenInventory,
        subItems: [
            { href: '/dashboard/inventory/receive', label: 'Bulk Receive', icon: Truck },
            { href: '/dashboard/inventory/restock', label: 'Restock / Purchase', icon: ArrowDownUp },
            { href: '/dashboard/inventory/batches', label: 'Stock Batch List', icon: ListChecks }
        ]
    },
    { href: '/dashboard/customers', label: 'Customers', icon: Users },
    { href: '/dashboard/suppliers', label: 'Suppliers', icon: Building },
    { href: '/dashboard/users', label: 'User Management', icon: Users },
    { href: '/dashboard/reports', label: 'Reports', icon: LineChart },
  ];
  
  useEffect(() => {
    // If the current path is under inventory, open the collapsible
    if (pathname.startsWith('/dashboard/inventory')) {
      setOpenInventory(true);
    }
  }, [pathname]);


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
  
  const renderNavLinks = (isMobile = false) => {
    return navLinks.map((link) => {
      const Icon = link.icon;

      if (link.subItems) {
        const isParentActive = pathname.startsWith(`/dashboard/${link.id}`);
        return (
          <Collapsible key={link.id} open={link.isOpen} onOpenChange={link.setIsOpen}>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isParentActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                isMobile && 'mx-[-0.65rem] gap-4 rounded-xl'
              )}
            >
              <Icon className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
              {link.label}
              <ChevronDown className={cn(
                  "ml-auto h-4 w-4 transition-transform",
                  link.isOpen && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-7 pt-2 space-y-1">
                {link.subItems.map(subLink => {
                const SubIcon = subLink.icon;
                const isSubActive = pathname === subLink.href;
                return (
                    <Link
                    key={subLink.href}
                    href={subLink.href}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isSubActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                    )}
                    >
                    <SubIcon className="h-4 w-4" />
                    {subLink.label}
                    </Link>
                )
                })}
            </CollapsibleContent>
          </Collapsible>
        )
      }

      const isActive = pathname === link.href;
      return (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isMobile && 'mx-[-0.65rem] gap-4 rounded-xl'
            )}
        >
          <Icon className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
          {link.label}
          {link.badge && (
            <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {link.badge}
            </Badge>
          )}
        </Link>
      );
    });
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
              {renderNavLinks()}
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
                {renderNavLinks(true)}
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
