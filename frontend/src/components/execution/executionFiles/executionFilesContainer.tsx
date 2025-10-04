import type { ExecutionOutput } from "@/client";
import { Figure } from "@/components/diagnostics/figure.tsx";
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

const FiguresCard = ({ outputs }: { outputs: ExecutionOutput[] }) => {
  const plotOutputs = outputs.filter((output) => output.output_type === "plot");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Figures</CardTitle>
        <CardDescription>
          The datasets that were used in the calculation of this diagnostic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {plotOutputs.map((output) => (
            <Figure key={output.id} {...output} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export function ExecutionFilesContainer({
  outputs,
}: ExecutionFilesContainerProps) {
  return (
    <>
      <FiguresCard outputs={outputs} />
      <OutputListTable results={outputs} />
    </>
  );
}
