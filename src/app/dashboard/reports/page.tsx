'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcessedOrdersReport } from '@/app/dashboard/reports/processed-orders-report';
import { SalesReport } from '@/app/dashboard/reports/sales-report';
import { PnlReport } from '@/app/dashboard/reports/pnl-report';
import { LayawayReport } from '@/app/dashboard/reports/layaway-report';
import { CashFlowReport } from '@/app/dashboard/reports/cashflow-report';
import { AccountsReceivableReport } from '@/app/dashboard/reports/ar-report';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SalesByProductReport } from '@/components/dashboard/reports/sales-by-product-report';
import { ToOrderReport } from '@/components/dashboard/reports/to-order-report';

export default function ReportsPage() {
  const { userProfile } = useUserProfile();
  
  const roles = userProfile?.roles || [];
  const isInventory = roles.includes('Inventory') && !roles.includes('Owner') && !roles.includes('Admin');
  const isManagement = roles.includes('Owner') || roles.includes('Admin');

  // Default tab based on role
  const defaultValue = isInventory ? "processed-orders" : "pnl-statement";

  return (
    <Tabs defaultValue={defaultValue} className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList className="flex-wrap h-auto">
          {isManagement && <TabsTrigger value="pnl-statement">P&L Statement</TabsTrigger>}
          {isManagement && <TabsTrigger value="sales">Sales by Person</TabsTrigger>}
          <TabsTrigger value="processed-orders">Processed Orders (Printing)</TabsTrigger>
          <TabsTrigger value="sales-product">Sales by Product</TabsTrigger>
          <TabsTrigger value="to-order">To Order (Procurement)</TabsTrigger>
          {isManagement && <TabsTrigger value="layaway-report">Lay-away Balances</TabsTrigger>}
          {isManagement && <TabsTrigger value="ar-report">Accounts Receivable</TabsTrigger>}
          {isManagement && <TabsTrigger value="cashflow-report">Cash Flow</TabsTrigger>}
        </TabsList>
      </div>
      
      {isManagement && (
        <TabsContent value="pnl-statement">
            <PnlReport />
        </TabsContent>
      )}
      
      {isManagement && (
        <TabsContent value="sales">
            <SalesReport />
        </TabsContent>
      )}

      <TabsContent value="processed-orders">
        <ProcessedOrdersReport />
      </TabsContent>

      <TabsContent value="sales-product">
        <SalesByProductReport />
      </TabsContent>

      <TabsContent value="to-order">
        <ToOrderReport />
      </TabsContent>

      {isManagement && (
        <TabsContent value="layaway-report">
            <LayawayReport />
        </TabsContent>
      )}

      {isManagement && (
        <TabsContent value="ar-report">
            <AccountsReceivableReport />
        </TabsContent>
      )}

      {isManagement && (
        <TabsContent value="cashflow-report">
            <CashFlowReport />
        </TabsContent>
      )}
    </Tabs>
  );
}