import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function OrdersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Orders</CardTitle>
        <CardDescription>
          View and manage customer orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12">
          <p className="text-lg font-semibold">Order Management Coming Soon</p>
          <p className="text-muted-foreground mt-2">
            This section will contain a detailed table of all sales orders, with filtering and search capabilities.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
