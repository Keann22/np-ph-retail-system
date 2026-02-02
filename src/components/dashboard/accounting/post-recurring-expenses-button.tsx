'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, doc, query, runTransaction, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

type RecurringExpense = {
    id: string;
    name: string;
    amount: number;
    category: string;
    dayOfMonth: number;
};

export function PostRecurringExpensesButton() {
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    const handlePostExpenses = async () => {
        if (!firestore) return;

        setIsLoading(true);
        toast({
            title: "Posting Expenses...",
            description: "Checking for recurring expenses to post for this month.",
        });

        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);

            const recurringExpensesRef = collection(firestore, 'recurringExpenses');
            const expensesRef = collection(firestore, 'expenses');
            
            let postedCount = 0;
            let skippedCount = 0;

            await runTransaction(firestore, async (transaction) => {
                // 1. Get all recurring expense definitions transactionally
                const recurringSnapshot = await transaction.get(recurringExpensesRef);
                const recurringExpenses = recurringSnapshot.docs.map(d => d.data() as RecurringExpense);
                
                // 2. Get all expenses already posted this month
                const monthlyExpensesQuery = query(
                    expensesRef,
                    where('expenseDate', '>=', monthStart.toISOString()),
                    where('expenseDate', '<=', monthEnd.toISOString())
                );
                const monthlySnapshot = await transaction.get(monthlyExpensesQuery);

                // Create a set of descriptions for quick lookup to avoid duplicates
                const postedDescriptions = new Set(monthlySnapshot.docs.map(d => d.data().description));
                
                // 3. Loop and post
                for (const recurring of recurringExpenses) {
                    const description = `Recurring: ${recurring.name}`;
                    if (postedDescriptions.has(description)) {
                        skippedCount++;
                        continue;
                    }
                    
                    let dayToUse = recurring.dayOfMonth;
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    if (dayToUse > daysInMonth) {
                        dayToUse = daysInMonth;
                    }
                    const expenseDate = new Date(currentYear, currentMonth, dayToUse);

                    const newExpenseRef = doc(expensesRef);
                    transaction.set(newExpenseRef, {
                        id: newExpenseRef.id,
                        expenseDate: expenseDate.toISOString(),
                        amount: recurring.amount,
                        category: recurring.category,
                        description: description,
                    });
                    postedCount++;
                }
            });
            
            toast({
                title: "Processing Complete",
                description: `${postedCount} expenses posted. ${skippedCount} were already posted for this month and were skipped.`,
            });

        } catch (error: any) {
            console.error("Failed to post recurring expenses:", error);
            toast({
                variant: 'destructive',
                title: 'Posting Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button onClick={handlePostExpenses} disabled={isLoading} variant="outline">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Post Monthly Expenses
        </Button>
    );
}
