'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addDocumentNonBlocking, useFirestore } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";

const bulkUploadSchema = z.object({
  csvFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "A single CSV file is required.")
    .transform((files) => files[0] as File)
    .refine(
      (file) => file.type === "text/csv",
      "The selected file must be a .csv file."
    ),
});

// Matches the expected CSV header
const EXPECTED_HEADERS = ['name', 'sku', 'description', 'categoryId', 'sellingPrice', 'costPrice', 'stock', 'supplierLink'];

export function BulkUploadProductsDialog() {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const canViewCostPrice = userProfile && (userProfile.roles.includes('Owner') || userProfile.roles.includes('Admin'));

  const form = useForm<z.infer<typeof bulkUploadSchema>>({
    resolver: zodResolver(bulkUploadSchema),
    defaultValues: {
      csvFile: undefined,
    }
  });

  const processCsvData = async (csvData: string) => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      toast({
        variant: "destructive",
        title: "Invalid CSV Data",
        description: "Your CSV data must include a header row and at least one product row.",
      });
      setIsUploading(false);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    
    const requiredHeaders = canViewCostPrice 
      ? EXPECTED_HEADERS 
      : EXPECTED_HEADERS.filter(h => h !== 'costPrice');
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
        toast({
            variant: "destructive",
            title: "Invalid CSV Header",
            description: `The following required columns are missing: ${missingHeaders.join(', ')}.`,
        });
        setIsUploading(false);
        return;
    }

    const productsCollection = collection(firestore, 'products');
    const inventoryMovementsCollection = collection(firestore, 'inventoryMovements');

    // Fetch all existing SKUs to prevent duplicates
    const existingProductsSnapshot = await getDocs(productsCollection);
    const existingSkus = new Set(existingProductsSnapshot.docs.map(doc => doc.data().sku));

    const dataRows = lines.slice(1);
    const uploadPromises: Promise<void>[] = [];
    let successfulUploads = 0;
    let skippedCount = 0;

    for (const line of dataRows) {
        // This is a naive CSV parser. It will fail if values contain commas.
        const values = line.split(',');
        const productObj: {[key: string]: any} = {};
        headers.forEach((header, index) => {
            productObj[header] = values[index]?.trim() || '';
        });

        const sku = productObj.sku;

        if (!productObj.name && !sku) {
            console.warn(`Skipping row because both name and SKU are missing: ${line}`);
            continue; // Skip what seems to be an empty row
        }

        if (!sku) {
            console.warn(`Skipping product "${productObj.name}" because SKU is missing.`);
            skippedCount++;
            continue; // Skip products without an SKU
        }

        if (existingSkus.has(sku)) {
            console.warn(`Skipping duplicate SKU: ${sku}`);
            skippedCount++;
            continue; // Skip if SKU already exists in DB or in a previous row of this file
        }
        
        existingSkus.add(sku); // Add to set to catch duplicates within the same file

        const stock = parseInt(productObj.stock, 10) || 0;
        const sellingPrice = parseFloat(productObj.sellingPrice) || 0;
        const costPrice = canViewCostPrice ? (parseFloat(productObj.costPrice) || 0) : 0;

        const productData = {
            name: productObj.name || '',
            sku: sku,
            description: productObj.description || '',
            categoryId: productObj.categoryId || 'Uncategorized',
            supplierLink: productObj.supplierLink || '',
            images: [], // Images are not supported in this bulk upload
            sellingPrice,
            costPrice,
            stock,
        };

        const uploadPromise = addDocumentNonBlocking(productsCollection, productData)
            .then(async (newProductRef) => {
                if (newProductRef && stock > 0) {
                    await addDocumentNonBlocking(inventoryMovementsCollection, {
                        productId: newProductRef.id,
                        quantityChange: stock,
                        movementType: 'initial_stock',
                        timestamp: new Date().toISOString(),
                        reason: 'Bulk upload',
                    });
                }
                successfulUploads++;
            }).catch(err => {
                console.error(`Failed to upload product with SKU ${sku}:`, err);
            });
        
        uploadPromises.push(uploadPromise);
    }

    await Promise.all(uploadPromises);
    
    setIsUploading(false);
    setOpen(false);
    form.reset();

    let description = `${successfulUploads} products were uploaded.`;
    if (skippedCount > 0) {
        description += ` ${skippedCount} products were skipped due to missing or duplicate SKUs. Check console for details.`;
    }

    toast({
      title: "Bulk Upload Complete",
      description: description,
    });
  }

  async function onSubmit(values: z.infer<typeof bulkUploadSchema>) {
    setIsUploading(true);
    toast({
      title: "Processing Bulk Upload...",
      description: "Please wait while we process your product data.",
    });

    const file = values.csvFile;
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processCsvData(content);
    };

    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "Could not read the contents of the uploaded file.",
      });
      setIsUploading(false);
    };

    reader.readAsText(file);
  }
  
  const csvTemplate = canViewCostPrice 
    ? `name,sku,description,categoryId,sellingPrice,costPrice,stock,supplierLink`
    : `name,sku,description,categoryId,sellingPrice,stock,supplierLink`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Bulk Upload</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <DialogDescription>
            Select a .csv file to upload. The first row must be a header. Note: values should not contain commas.
          </DialogDescription>
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md font-mono">
            Required columns: {csvTemplate}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="csvFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".csv"
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>Cancel</Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Products
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
