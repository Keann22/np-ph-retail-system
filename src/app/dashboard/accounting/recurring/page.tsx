'use client';

import { MoreHorizontal } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddRecurringExpenseDialog } from '@/components/dashboard/accounting/add-recurring-expense-dialog';


// Matches the Firestore document structure for a recurring expense
type RecurringExpense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
};

export default function RecurringExpensesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const recurringExpensesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'recurringExpenses'), orderBy('dayOfMonth', 'asc')) : null),
    [firestore, user]
  );
  const { data: recurringExpenses, isLoading } = useCollection<RecurringExpense>(recurringExpensesQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="font-headline">Recurring Expenses</CardTitle>
          <CardDescription>
            Define monthly expenses that can be posted in one click.
          </CardDescription>
        </div>
        <AddRecurringExpenseDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day of Month</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead><span className='sr-only'>Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                 <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                 </TableRow>
            ))}
            {recurringExpenses && recurringExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className='font-medium'>{expense.dayOfMonth}</TableCell>
                <TableCell>{expense.name}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell className="text-right">₱{expense.amount.toFixed(2)}</TableCell>
                <TableCell>
                  {/* Actions dropdown will go here */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (!recurringExpenses || recurringExpenses.length === 0) && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                <p className="text-lg font-semibold">No recurring expenses defined</p>
                <p className="text-muted-foreground mt-2">
                    Click "Add Recurring Expense" to get started.
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
