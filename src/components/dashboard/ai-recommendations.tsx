"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMarketingRecommendations } from '@/ai/flows/generate-marketing-recommendations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  customerOrderHistory: z.string().min(10, {
    message: "Please provide a more detailed order history.",
  }),
});

type RecommendationOutput = {
  marketingContentRecommendation: string;
  productRecommendations: string;
} | null;

export function AiRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendationOutput>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerOrderHistory: "1x DuraCast Iron Skillet\n2x FlexiBoard Cutting Mats (Set of 3)\n1x EcoSprout Bamboo Steamer (ordered 3 months ago)",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setRecommendations(null);
    try {
      const result = await generateMarketingRecommendations(values);
      setRecommendations(result);
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      // Here you would typically show a toast notification to the user
      // toast({ variant: "destructive", title: "Error", description: "Failed to generate recommendations." })
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sparkles className="text-accent" />
          AI-Driven Recommendations
        </CardTitle>
        <CardDescription>
          Generate marketing and product recommendations based on a customer's order history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customerOrderHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Order History</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 1x Product A, 2x Product B"
                      className="resize-none min-h-[100px] font-code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Recommendations'
              )}
            </Button>
          </form>
        </Form>
        {(isLoading || recommendations) && <Separator className="my-6" />}
        {isLoading && (
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <div className="h-6 w-1/2 rounded-md bg-muted animate-pulse" />
                    <div className="h-16 w-full rounded-md bg-muted animate-pulse" />
                </div>
                <div className="space-y-2">
                    <div className="h-6 w-1/2 rounded-md bg-muted animate-spin" />
                    <div className="h-16 w-full rounded-md bg-muted animate-pulse" />
                </div>
            </div>
        )}
        {recommendations && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <h3 className="font-semibold font-headline">Marketing Content</h3>
                <p className="text-sm text-muted-foreground">{recommendations.marketingContentRecommendation}</p>
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold font-headline">Product Suggestions</h3>
                 <p className="text-sm text-muted-foreground">{recommendations.productRecommendations}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
