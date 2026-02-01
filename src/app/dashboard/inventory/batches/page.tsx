import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function BatchesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Stock Batch List</CardTitle>
        <CardDescription>
          View all individual stock batches for your products.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
          <p className="text-lg font-semibold">Feature Coming Soon</p>
          <p className="text-muted-foreground mt-2">
            This page will allow you to view and manage individual stock batches.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
