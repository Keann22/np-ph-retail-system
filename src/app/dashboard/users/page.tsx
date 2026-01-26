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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useState } from 'react';
import { EditUserRolesDialog } from '@/components/dashboard/edit-user-roles-dialog';

// Matches the Firestore document structure for a user profile
export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: ('Owner' | 'Admin' | 'Warehouse Manager' | 'Sales')[];
};

export default function UsersPage() {
  const firestore = useFirestore();
  const { userProfile: currentUserProfile } = useUserProfile();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);


  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);
  
  const canManageUsers = currentUserProfile && (currentUserProfile.roles.includes('Owner') || currentUserProfile.roles.includes('Admin'));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">User Management</CardTitle>
            <CardDescription>
              View and manage user roles and permissions.
            </CardDescription>
          </div>
          {/* <Button>Add User</Button> */}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                {canManageUsers && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className='space-y-2'>
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      {canManageUsers && (
                        <TableCell>
                            <Skeleton className="h-8 w-8" />
                        </TableCell>
                      )}
                  </TableRow>
              ))}
              {users && users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar>
                          <AvatarFallback>{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                      <div className='flex flex-wrap gap-1'>
                          {user.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                      </div>
                  </TableCell>
                  {canManageUsers && (
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
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>Edit Roles</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && (!users || users.length === 0) && (
              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                  <p className="text-lg font-semibold">No users found</p>
                  <p className="text-muted-foreground mt-2">
                      User documents need to be created in Firestore.
                  </p>
              </div>
          )}
        </CardContent>
        {users && users.length > 0 && (
          <CardFooter>
              <div className="text-xs text-muted-foreground">
              Showing <strong>1-{users.length}</strong> of <strong>{users.length}</strong> users
              </div>
          </CardFooter>
        )}
      </Card>
      <EditUserRolesDialog 
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}
      />
    </>
  );
}
