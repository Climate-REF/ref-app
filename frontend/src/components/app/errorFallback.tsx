import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  showRefreshButton?: boolean;
  showErrorDetails?: boolean;
}

export function ErrorFallback({
  error,
  resetError,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try refreshing the page or return to the home page.",
  showHomeButton = true,
  showRefreshButton = true,
  showErrorDetails = import.meta.env.DEV,
}: ErrorFallbackProps) {
  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            {showRefreshButton && (
              <Button onClick={handleRefresh} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}

            {showHomeButton && (
              <Button variant="outline" asChild className="flex-1">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            )}
          </div>

          {showErrorDetails && error && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Bug className="mr-2 h-4 w-4" />
                  Show Error Details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-sm font-medium text-destructive mb-2">
                    {error.name}: {error.message}
                  </div>
                  {error.stack && (
                    <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Specialized error fallbacks for different contexts
export function PageErrorFallback({ error }: { error?: Error }) {
  return (
    <ErrorFallback
      error={error}
      title="Page Error"
      description="This page encountered an error. You can try refreshing or navigate to another page."
      showHomeButton={true}
      showRefreshButton={true}
    />
  );
}

export function ComponentErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError?: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      resetError={resetError}
      title="Component Error"
      description="A component on this page failed to load. Try refreshing to fix the issue."
      showHomeButton={false}
      showRefreshButton={true}
    />
  );
}

export function ApiErrorFallback({ error }: { error?: Error }) {
  return (
    <ErrorFallback
      error={error}
      title="Connection Error"
      description="Unable to connect to the server. Please check your connection and try again."
      showHomeButton={false}
      showRefreshButton={true}
    />
  );
}
