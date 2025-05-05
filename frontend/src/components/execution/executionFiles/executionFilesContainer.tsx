import type { ExecutionOutput } from "@/client";
import { Figure } from "@/components/execution/executionFiles/figure.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import OutputListTable from "./outputListTable.tsx";

type ExecutionFilesContainerProps = {
  outputs: ExecutionOutput[];
};

export function ExecutionFilesContainer({
  outputs,
}: ExecutionFilesContainerProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Figures</CardTitle>
          <CardDescription>
            The datasets that were used in the calculation of this diagnostic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {outputs
              .filter((output) => output.output_type === "plot")
              .map((output) => (
                <Figure key={output.id} {...output} />
              ))}
          </div>
        </CardContent>
      </Card>
      <OutputListTable results={outputs} />
    </>
  );
}
