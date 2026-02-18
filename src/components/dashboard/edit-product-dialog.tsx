'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateDocumentNonBlocking, useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, getDocs, query, where, limit, orderBy, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import type { FormattedProduct } from '@/app/dashboard/products/page';

type Supplier = { id: string; name: string; [key: string]: any;};

const editProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
});

type EditProductFormValues = z.infer<typeof editProductSchema>;

interface EditProductDialogProps {
  product: FormattedProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({ product, open, onOpenChange }: EditProductDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  const isManagement = useMemo(() => userProfile?.roles.some(r => ['Admin', 'Owner'].includes(r)), [userProfile]);

  const suppliersQuery = useMemoFirebase(
    () => {
      // FIX: Only query suppliers if user is Management AND has typed a search term.
      if (!firestore || !user || !isManagement || supplierSearch.length < 1) return null;
      const searchTermCapitalized = supplierSearch.charAt(0).toUpperCase() + supplierSearch.slice(1);
      return query(
        collection(firestore, 'suppliers'),
        orderBy('name'),
        where('name', '>=', searchTermCapitalized),
        where('name', '<=', searchTermCapitalized + '\uf8ff'),
        limit(10)
      );
    },
    [firestore, user, supplierSearch, isManagement]
  );
  const { data: supplierResults, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);


  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
  });

  useEffect(() => {
    if (product && open) {
      form.reset({
        name: product.name,
        sku: product.sku,
        description: product.description,
        categoryId: product.categoryId,
        supplierId: product.supplierId,
        sellingPrice: product.sellingPrice,
      });
      
      // FIX: Guard the direct document fetch for supplier info too.
      if (product.supplierId && firestore && isManagement) {
        const supplierDocRef = doc(firestore, 'suppliers', product.supplierId);
        getDoc(supplierDocRef).then(docSnap => {
            if (docSnap.exists()) {
                setSelectedSupplier({ id: docSnap.id, ...docSnap.data()} as Supplier);
            }
        });
      }
    } else if (!open) {
      form.reset();
      setSelectedSupplier(null);
      setSupplierSearch('');
    }
  }, [product, open, form, firestore, isManagement]);
  

  if (!product) {
    return null;
  }

  async function onSubmit(values: EditProductFormValues) {
    if (!firestore || !product) return;
    
    if (values.sku !== product.sku) {
        const productsCollection = collection(firestore, 'products');
        const q = query(productsCollection, where("sku", "==", values.sku));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            toast({
                variant: "destructive",
                title: "Duplicate SKU",
                description: `A product with SKU "${values.sku}" already exists. Please use a unique SKU.`,
            });
            return;
        }
    }

    onOpenChange(false);
    
    toast({
      title: "Updating Product...",
      description: `Your product "${values.name}" is being updated.`,
    });

    const productDocRef = doc(firestore, 'products', product.id);
    updateDocumentNonBlocking(productDocRef, values).then(() => {
         toast({
          title: "Product Updated",
          description: `${values.name} has been successfully updated.`,
        });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product: {product.name}</DialogTitle>
          <DialogDescription>
            Make changes to the product details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2 py-4 max-h-[70vh] overflow-y-auto px-1">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., AeroGrip Silicon Utensil Set" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., AG-SUS-001" {...field} readOnly className="bg-muted"/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Describe the product" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Kitchenware" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                {isManagement && (
                  <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                              <FormLabel>Supplier</FormLabel>
                              {selectedSupplier ? (
                                  <div className="flex items-center justify-between rounded-md border border-input bg-background p-2 text-sm h-10">
                                      <p>{selectedSupplier.name}</p>
                                      <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                              setSelectedSupplier(null);
                                              form.setValue('supplierId', '');
                                          }}
                                      >
                                          Change
                                      </Button>
                                  </div>
                              ) : (
                                  <Command className="rounded-lg border">
                                      <CommandInput 
                                          placeholder="Search suppliers by name..." 
                                          value={supplierSearch} 
                                          onValueChange={setSupplierSearch}
                                      />
                                      {supplierSearch.length > 0 && (
                                          <CommandList>
                                              {isLoadingSuppliers && <CommandItem disabled>Searching...</CommandItem>}
                                              {supplierResults && supplierResults.length > 0 && (
                                                  <CommandGroup>
                                                  {supplierResults.map((s) => (
                                                      <CommandItem
                                                          key={s.id}
                                                          value={s.name}
                                                          onSelect={() => {
                                                              form.setValue("supplierId", s.id)
                                                              setSelectedSupplier(s);
                                                              setSupplierSearch('');
                                                          }}
                                                      >
                                                          {s.name}
                                                      </CommandItem>
                                                  ))}
                                                  </CommandGroup>
                                              )}
                                              {!isLoadingSuppliers && (!supplierResults || supplierResults.length === 0) && supplierSearch.length > 1 && <CommandEmpty>No suppliers found.</CommandEmpty>}
                                          </CommandList>
                                      )}
                                  </Command>
                              )}
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                )}
                 <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Selling Price (₱)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="49.99" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
