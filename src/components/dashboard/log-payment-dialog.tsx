'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFirestore, useStorage } from "@/firebase";
import { collection, doc, runTransaction } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Order } from "@/app/dashboard/orders/page";
import { useEffect, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FileUpload } from "../ui/file-upload";

const paymentSchema = z.object({
  paymentDate: z.date({ required_error: "A payment date is required." }),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.string({ required_error: "Please select a payment method." }),
  proofOfPayment: z.custom<File[]>().optional(),
}).refine(data => {
    if (data.paymentMethod === 'GCash') {
        return data.proofOfPayment && data.proofOfPayment.length > 0;
    }
    return true;
}, {
    message: "A proof of payment photo is required for GCash.",
    path: ["proofOfPayment"],
});


type PaymentFormValues = z.infer<typeof paymentSchema>;

interface LogPaymentDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = ["GCash", "Shopee Platform Payouts", "Cash", "Bank Transfer", "COD Payed"];

export function LogPaymentDialog({ order, open, onOpenChange }: LogPaymentDialogProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: order.balanceDue > 0 ? order.balanceDue : 0,
      paymentMethod: undefined,
    },
  });

  useEffect(() => {
    if (order) {
      form.reset({
        paymentDate: new Date(),
        amount: order.balanceDue > 0 ? order.balanceDue : 0,
        paymentMethod: undefined,
        proofOfPayment: [],
      });
    }
  }, [order, form]);

  async function onSubmit(values: PaymentFormValues) {
    if (!firestore || !storage) return;
    setIsSubmitting(true);

    toast({
      title: "Logging Payment...",
      description: `Saving payment for order #${order.id.substring(0, 7)}...`,
    });

    try {
        let proofOfPaymentUrl = '';
        if (values.paymentMethod === 'GCash' && values.proofOfPayment && values.proofOfPayment.length > 0) {
            const file = values.proofOfPayment[0];
            const storageRef = ref(storage, `payment-proofs/${order.id}/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            proofOfPaymentUrl = await getDownloadURL(storageRef);
        }

        const paymentsCollection = collection(firestore, 'payments');
        const orderRef = doc(firestore, 'orders', order.id);

        await runTransaction(firestore, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("Order does not exist!");
            }
            const currentOrderData = orderDoc.data() as Order;
            const newAmountPaid = currentOrderData.amountPaid + values.amount;
            const newBalanceDue = currentOrderData.totalAmount - newAmountPaid;
            const newStatus = newBalanceDue <= 0 ? 'Completed' : currentOrderData.orderStatus;

            const newPaymentRef = doc(paymentsCollection);
            transaction.set(newPaymentRef, {
                id: newPaymentRef.id,
                orderId: order.id,
                paymentDate: values.paymentDate.toISOString(),
                amount: values.amount,
                paymentMethod: values.paymentMethod,
                ...(proofOfPaymentUrl && { proofOfPaymentUrl }),
            });

            transaction.update(orderRef, {
                amountPaid: newAmountPaid,
                balanceDue: newBalanceDue,
                orderStatus: newStatus,
            });
        });
        
        toast({
            title: "Payment Logged",
            description: `₱${values.amount.toFixed(2)} has been logged successfully.`,
        });
        onOpenChange(false);
    } catch (error: any) {
        console.error("Payment logging failed:", error);
        toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: error.message || 'Could not save the payment.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Payment for Order</DialogTitle>
          <DialogDescription>
            Balance due: ₱{order.balanceDue.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₱)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             {form.watch('paymentMethod') === 'GCash' && (
              <FormField
                control={form.control}
                name="proofOfPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proof of Payment</FormLabel>
                    <FormControl>
                        <FileUpload
                            value={field.value ?? []}
                            onChange={(files: File[]) => field.onChange(files)}
                            multiple={false}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
