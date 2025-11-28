import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <Card className="border-destructive/20 bg-destructive/5 shadow-card animate-slide-up">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Unable to Fetch Result
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {message}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="mt-2">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
