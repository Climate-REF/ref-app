import { AlertCircle, Check, Server } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useApiEndpoint } from "@/hooks/useApiEndpoint";

export function ApiEndpointSelector() {
  const {
    currentEndpoint,
    currentKey,
    changeEndpoint,
    getAvailableEndpoints,
    getCurrentDisplayName,
    clearEndpoint,
    isUsingOverride,
  } = useApiEndpoint();
  const availableEndpoints = getAvailableEndpoints();

  const handleEndpointChange = (value: string) => {
    changeEndpoint(value as any);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API Endpoint Configuration
          </CardTitle>
          <CardDescription>
            Select the Climate REF API endpoint to connect to. This setting is
            stored locally and will persist across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-sm font-medium">
              Current Endpoint {isUsingOverride ? "(override)" : "(default)"}:
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{getCurrentDisplayName}</div>
              <div className="text-sm text-muted-foreground font-mono">
                {currentEndpoint}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium">Available Endpoints:</div>
            <RadioGroup
              value={isUsingOverride ? currentKey : ""}
              onValueChange={handleEndpointChange}
            >
              {availableEndpoints.map((endpoint) => (
                <div key={endpoint.key} className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={endpoint.key}
                    id={endpoint.key}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={endpoint.key}
                      className="font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {endpoint.displayName}
                        {endpoint.isCurrent && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </Label>
                    <div className="text-sm text-muted-foreground font-mono">
                      {endpoint.url}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
            <Button onClick={clearEndpoint}>Clear Override</Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Changing the API endpoint will reload the page to apply the new
              configuration. Any unsaved changes will be lost.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
