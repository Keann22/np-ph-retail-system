'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddExpenseDialog } from '@/components/dashboard/accounting/add-expense-dialog';
import { PostRecurringExpensesButton } from '@/components/dashboard/accounting/post-recurring-expenses-button';
import { useUserProfile } from '@/hooks/useUserProfile';

// Matches the Firestore document structure for an expense
type Expense = {
  id: string;
  expenseDate: string; // ISO string
  amount: number;
  category: string;
  description?: string;
};

export default function ExpensesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { userProfile } = useUserProfile();

  const isManagement = useMemo(() => userProfile?.roles.some(r => ['Admin', 'Owner'].includes(r)), [userProfile]);

  const expensesQuery = useMemoFirebase(
    () => (firestore && user && isManagement ? query(collection(firestore, 'expenses'), orderBy('expenseDate', 'desc')) : null),
    [firestore, user, isManagement]
  );
  const { data: expenses, isLoading } = useCollection<Omit<Expense, 'id'>>(expensesQuery);

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  if (userProfile && !isManagement) {
    return (
        <Card className="m-6">
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view financial records.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="font-headline">Expenses</CardTitle>
          <CardDescription>
            View and record your business's operational costs.
          </CardDescription>
        </div>
        <div className='flex gap-2'>
          <PostRecurringExpensesButton />
          <AddExpenseDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
                 <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                 </TableRow>
            ))}
            {expenses && expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</TableCell>
                <TableCell className="font-medium">{expense.description || 'N/A'}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell className="text-right">₱{expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (!expenses || expenses.length === 0) && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                <p className="text-lg font-semibold">No expenses found</p>
                <p className="text-muted-foreground mt-2">
                    Click "Add Expense" to get started.
                </p>
            </div>
        )}
      </CardContent>
      {expenses && expenses.length > 0 && (
        <CardFooter className="justify-end space-x-2 font-semibold">
           <span>Total Expenses:</span> 
           <span>₱{totalExpenses.toFixed(2)}</span>
        </CardFooter>
      )}
    </Card>
  );
}
