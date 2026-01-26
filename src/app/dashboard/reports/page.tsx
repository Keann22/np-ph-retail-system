import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Reports</CardTitle>
        <CardDescription>
          Analyze your business performance with detailed financial reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12">
          <p className="text-lg font-semibold">Financial Reporting Coming Soon</p>
          <p className="text-muted-foreground mt-2">
            Detailed P&amp;L statements, Accounts Receivable reports, and cash flow analysis will be available here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
