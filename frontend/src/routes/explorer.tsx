import PageHeader from "@/components/app/pageHeader";
import { ThematicContent } from "@/components/explorer/thematicContent.tsx";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { useSearchParams } from "react-router";

const Explorer = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <>
      <PageHeader breadcrumbs={[]} title="Data Explorer" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <Card className="md:col-span-2">
            <CardContent className="space-y-6">
              <h1 className="text-3xl font-bold tracking-tight">
                Data Explorer
              </h1>
              <p className="text-muted-foreground">
                Explore and visualize climate model evaluation metrics across
                different dimensions
              </p>
            </CardContent>
          </Card>
        </div>
        <div>
          <Tabs
            value={searchParams.get("tab") ?? "themes"}
            className="space-y-4"
            onValueChange={(value) =>
              setSearchParams({ ...searchParams, tab: value })
            }
          >
            <TabsList className="w-full">
              <TabsTrigger value="themes">Thematic Areas</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="themes" className="space-y-4">
              <ThematicContent />
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <div />
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Explorer;
