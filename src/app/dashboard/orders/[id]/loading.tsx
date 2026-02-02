import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-32" /></div>
            <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-32" /></div>
            <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-32" /></div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
            <CardHeader>
                <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
            <Table>
                <TableBody>
                    <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
