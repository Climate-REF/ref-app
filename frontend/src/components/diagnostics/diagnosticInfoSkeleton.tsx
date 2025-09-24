import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList } from "@/components/ui/tabs";

export function DiagnosticInfoSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="animate-pulse h-6 bg-muted rounded-md w-3/4" />
          <div className="animate-pulse h-4 bg-muted/foreground rounded-md w-full mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="animate-pulse h-4 bg-muted rounded-md w-1/2" />
              <div className="animate-pulse h-5 bg-muted rounded-md w-3/4" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse h-4 bg-muted rounded-md w-1/3" />
              <div className="animate-pulse h-5 bg-muted rounded-md w-1/2" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse h-4 bg-muted rounded-md w-2/3" />
              <div className="animate-pulse h-5 bg-muted rounded-md w-full" />
            </div>
            <div className="space-y-1">
              <div className="animate-pulse h-4 bg-muted rounded-md w-3/4" />
              <div className="animate-pulse h-5 bg-muted rounded-md w-1/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs className="space-y-4">
        <TabsList>
          <div className="animate-pulse h-8 bg-muted rounded-md w-32" />
          <div className="animate-pulse h-8 bg-muted rounded-md w-28 ml-2" />
          <div className="animate-pulse h-8 bg-muted rounded-md w-20 ml-2" />
        </TabsList>
      </Tabs>
    </div>
  );
}
