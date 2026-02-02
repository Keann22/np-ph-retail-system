import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export default function CustomerDetailLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-80" />
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
                <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
           <Table>
            <TableBody>
                <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                <TableRow><TableCell><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
