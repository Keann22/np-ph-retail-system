import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CustomersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Customers</CardTitle>
        <CardDescription>
          View and manage your customer database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12">
          <p className="text-lg font-semibold">Customer Database Coming Soon</p>
          <p className="text-muted-foreground mt-2">
            This section will allow you to manage customer information and view their complete order history.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
