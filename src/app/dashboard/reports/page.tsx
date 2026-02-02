'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcessedOrdersReport } from '@/app/dashboard/reports/processed-orders-report';
import { SalesReport } from '@/app/dashboard/reports/sales-report';
import { PnlReport } from '@/app/dashboard/reports/pnl-report';
import { LayawayReport } from '@/app/dashboard/reports/layaway-report';
import { CashFlowReport } from '@/app/dashboard/reports/cashflow-report';
import { AccountsReceivableReport } from '@/app/dashboard/reports/ar-report';

export default function ReportsPage() {
  return (
    <Tabs defaultValue="pnl-statement" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pnl-statement">P&L Statement</TabsTrigger>
          <TabsTrigger value="sales">Sales by Person</TabsTrigger>
          <TabsTrigger value="processed-orders">Processed Orders</TabsTrigger>
          <TabsTrigger value="layaway-report">Lay-away Balances</TabsTrigger>
          <TabsTrigger value="ar-report">Accounts Receivable</TabsTrigger>
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
      <TabsContent value="ar-report">
        <AccountsReceivableReport />
      </TabsContent>
      <TabsContent value="cashflow-report">
        <CashFlowReport />
      </TabsContent>
    </Tabs>
  );
}
