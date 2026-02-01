'use client';

import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddSupplierDialog } from '@/components/dashboard/add-supplier-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Matches the Firestore document structure for a supplier
type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  facebookProfileLink?: string;
  website?: string;
};

export default function SuppliersPage() {
  const firestore = useFirestore();

  const suppliersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'suppliers') : null),
    [firestore]
  );
  const { data: suppliers, isLoading } = useCollection<Omit<Supplier, 'id'>>(suppliersQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Suppliers</CardTitle>
          <CardDescription>
            View and manage your product suppliers.
          </CardDescription>
        </div>
        <AddSupplierDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead className="hidden md:table-cell">Contact Person</TableHead>
              <TableHead className="hidden md:table-cell">Contact Info</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
                 <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className='space-y-2'>
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell>
                        <Skeleton className="h-8 w-8" />
                    </TableCell>
                 </TableRow>
            ))}
            {suppliers && suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarFallback>{supplier.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{supplier.name}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{supplier.contactPerson || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {supplier.facebookProfileLink ? (
                    <a href={supplier.facebookProfileLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Facebook
                    </a>
                  ) : supplier.website ? (
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Website
                    </a>
                  ) : (
                    supplier.email || 'N/A'
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View Products</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (!suppliers || suppliers.length === 0) && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                <p className="text-lg font-semibold">No suppliers found</p>
                <p className="text-muted-foreground mt-2">
                    Click "Add Supplier" to get started.
                </p>
            </div>
        )}
      </CardContent>
      {suppliers && suppliers.length > 0 && (
        <CardFooter>
            <div className="text-xs text-muted-foreground">
            Showing <strong>1-{suppliers.length}</strong> of <strong>{suppliers.length}</strong> suppliers
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
