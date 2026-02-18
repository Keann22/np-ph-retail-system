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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteDocumentNonBlocking, useCollection, useFirestore, useMemoFirebase, useAuth, initiatePasswordReset } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useState } from 'react';
import { EditUserRolesDialog } from '@/components/dashboard/edit-user-roles-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { EditUserDialog } from '@/components/dashboard/edit-user-dialog';

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: ('Owner' | 'Admin' | 'Inventory' | 'Sales')[];
};

export default function UsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { userProfile: currentUserProfile } = useUserProfile();
  const [editingRolesUser, setEditingRolesUser] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const canManageUsers = currentUserProfile && (currentUserProfile.roles.includes('Owner') || currentUserProfile.roles.includes('Admin'));

  // CRITICAL FIX: Only try to list users if authorized. This prevents the crash for Inventory role.
  const usersQuery = useMemoFirebase(
    () => (firestore && canManageUsers ? collection(firestore, 'users') : null),
    [firestore, canManageUsers]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);
  
  if (currentUserProfile && !canManageUsers) {
    return (
        <Card className="m-6">
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view the user directory.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const handlePasswordReset = (email: string) => {
    initiatePasswordReset(auth, email);
  };

  const confirmDelete = () => {
    if (!deletingUser || !firestore) return;
    if (currentUserProfile?.id === deletingUser.id) {
        toast({ variant: 'destructive', title: 'Action Forbidden', description: 'You cannot delete your own account.' });
        setDeletingUser(null);
        return;
    }
    const userDocRef = doc(firestore, 'users', deletingUser.id);
    deleteDocumentNonBlocking(userDocRef);
    toast({ title: "User Profile Deleted", description: `${deletingUser.email} has been removed.` });
    setDeletingUser(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">User Management</CardTitle>
            <CardDescription>Manage user roles and permissions.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
              ))}
              {users && users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar><AvatarFallback>{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback></Avatar>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><div className='flex flex-wrap gap-1'>{user.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}</div></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={currentUserProfile?.id === user.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>Edit User</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingRolesUser(user)}>Edit Roles</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handlePasswordReset(user.email)}>Send Password Reset</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingUser(user)}>Delete User</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EditUserDialog user={editingUser} open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)} />
      <EditUserRolesDialog user={editingRolesUser} open={!!editingRolesUser} onOpenChange={(isOpen) => !isOpen && setEditingRolesUser(null)} />
      <AlertDialog open={!!deletingUser} onOpenChange={(isOpen) => !isOpen && setDeletingUser(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will delete the profile for <strong>{deletingUser?.email}</strong>. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}