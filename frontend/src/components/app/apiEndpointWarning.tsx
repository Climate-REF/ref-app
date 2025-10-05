import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useApiEndpoint } from "@/hooks/useApiEndpoint";

export function ApiEndpointWarning() {
  const { currentEndpoint, getCurrentDisplayName, clearEndpoint } =
    useApiEndpoint();

  const handleClearOverride = () => {
    clearEndpoint();
  };

  return (
    <Alert variant={"destructive"}>
      <AlertTitle>Using API Endpoint Override</AlertTitle>
      <AlertDescription className="flex-1">
        {getCurrentDisplayName} ({currentEndpoint})
      </AlertDescription>
      <div className="flex items-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearOverride}
          className="h-auto p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset to default
        </Button>
        <Link to="/settings/api-endpoint">
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            Change endpoint
          </Button>
        </Link>
      </div>
    </Alert>
  );
}
