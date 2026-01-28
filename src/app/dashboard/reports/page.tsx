'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcessedOrdersReport } from '@/components/dashboard/processed-orders-report';
import { SalesReport } from '@/components/dashboard/sales-report';

export default function ReportsPage() {
  return (
    <Tabs defaultValue="processed-orders" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="processed-orders">Processed Orders</TabsTrigger>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="processed-orders">
        <ProcessedOrdersReport />
      </TabsContent>
      <TabsContent value="sales">
        <SalesReport />
      </TabsContent>
    </Tabs>
  );
}

    