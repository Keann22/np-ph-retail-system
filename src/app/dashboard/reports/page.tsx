'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcessedOrdersReport } from '@/components/dashboard/processed-orders-report';
import { SalesReport } from '@/components/dashboard/sales-report';
import { PnlReport } from '@/components/dashboard/reports/pnl-report';
import { LayawayReport } from '@/components/dashboard/reports/layaway-report';
import { CashFlowReport } from '@/components/dashboard/reports/cashflow-report';

export default function ReportsPage() {
  return (
    <Tabs defaultValue="pnl-statement" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pnl-statement">P&L Statement</TabsTrigger>
          <TabsTrigger value="sales">Sales by Person</TabsTrigger>
          <TabsTrigger value="processed-orders">Processed Orders</TabsTrigger>
          <TabsTrigger value="layaway-report">Lay-away Balances</TabsTrigger>
          <TabsTrigger value="cashflow-report">Cash Flow</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="pnl-statement">
        <PnlReport />
      </TabsContent>
      <TabsContent value="sales">
        <SalesReport />
      </TabsContent>
       <TabsContent value="processed-orders">
        <ProcessedOrdersReport />
      </TabsContent>
       <TabsContent value="layaway-report">
        <LayawayReport />
      </TabsContent>
      <TabsContent value="cashflow-report">
        <CashFlowReport />
      </TabsContent>
    </Tabs>
  );
}
