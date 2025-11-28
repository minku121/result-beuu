import { useEffect, useRef, useState } from "react";
import { ResultForm } from "@/components/ResultForm";
import { ResultDisplay } from "@/components/ResultDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEndpoint } from "@/config/endpoints";
import { normalizeResult } from "@/lib/normalizeResult";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastParams, setLastParams] = useState<any>(null);
  const { toast } = useToast();
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryLoopActiveRef = useRef(false);
  const [parallelCount, setParallelCount] = useState(5);
  const currentParamsRef = useRef<{ session: string; redg_no: string; semester: number } | null>(null);

  const cancelRetryLoop = () => {
    retryLoopActiveRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const singleAttempt = async (params: { session: string; redg_no: string; semester: number; }, i: number) => {
    const resolver = getEndpoint(params.session, params.semester);
    if (!resolver) return null;
    const { url, init } = resolver(params.redg_no);
    const finalUrl = url + (url.includes("?") ? `&__ts=${Date.now()}_${i}_${Math.random()}` : `?__ts=${Date.now()}_${i}_${Math.random()}`);
    try {
      const resp = await fetch(finalUrl, init);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const data = await resp.json();
      if (data?.error || data?.status === "error") throw new Error(data.message || data.error || "Failed");
      const normalized = normalizeResult(params.session, params.semester, params.redg_no, data);
      const hasName = normalized?.data?.name && String(normalized.data.name).trim().length > 0;
      if (!hasName) throw new Error("Incomplete");
      return normalized;
    } catch {
      return null;
    }
  };

  const startAggressiveParallelRetry = (params: { session: string; redg_no: string; semester: number; }) => {
    if (!autoRetryEnabled) return;
    if (retryLoopActiveRef.current) return;
    retryLoopActiveRef.current = true;
    toast({ title: "Auto fetching started", description: `Running ${Math.max(1, parallelCount)} parallel attempts` });
    const slots = Math.max(1, parallelCount);
    let stopped = false;
    const launch = async (slotIndex: number) => {
      if (stopped || !retryLoopActiveRef.current) return;
      const res = await singleAttempt(params, slotIndex);
      if (!res) {
        if (!stopped && retryLoopActiveRef.current) {
          launch(slotIndex + 1);
        }
        return;
      }
      stopped = true;
      retryLoopActiveRef.current = false;
      setResult(res);
      setError(null);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      toast({ title: "Result fetched successfully", description: "Your examination result has been retrieved." });
    };
    for (let i = 0; i < slots; i++) {
      launch(i);
    }
  };

  const fetchResult = async (params: {
    session: string;
    redg_no: string;
    semester: number;
  }) => {
    cancelRetryLoop();
    currentParamsRef.current = params;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLastParams(params);

    const resolver = getEndpoint(params.session, params.semester);
    if (!resolver) {
      setIsLoading(false);
      const msg = `Endpoint not configured for session ${params.session} semester ${params.semester}`;
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }

    const { url, init } = resolver(params.redg_no);

    try {
      const response = await fetch(url, init);
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      if (data?.error || data?.status === "error") {
        throw new Error(data.message || data.error || "Failed to fetch result");
      }

      const normalized = normalizeResult(params.session, params.semester, params.redg_no, data);
      const hasName = normalized?.data?.name && String(normalized.data.name).trim().length > 0;
      if (!hasName) {
        const msg = "Server returned incomplete data (missing name). Auto retrying...";
        setError(msg);
        toast({ title: "Server slow", description: msg, variant: "destructive" });
        if (autoRetryEnabled) {
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          startAggressiveParallelRetry(params);
        }
        return;
      }
      setResult(normalized);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      toast({
        title: "Result fetched successfully",
        description: "Your examination result has been retrieved.",
      });
    } catch (err: any) {
      const errorMessage = err.message || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      if (autoRetryEnabled) {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        startAggressiveParallelRetry(params);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastParams) {
      fetchResult(lastParams);
    }
  };

  useEffect(() => {
    if (!autoRetryEnabled && retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryLoopActiveRef.current = false;
    };
  }, [autoRetryEnabled]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl gradient-bg p-2.5 shadow-soft">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">BEU Result Portal</h1>
              <p className="text-sm text-muted-foreground">Bihar Engineering University</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 py-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Quick & Easy Result Check
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Check Your <span className="gradient-text">Examination Result</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your registration details below to fetch your semester examination results instantly.
            </p>
          </div>

          {/* Form Card */}
          <Card className="shadow-card border-0 overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Search Parameters</CardTitle>
              <CardDescription>
                Fill in your details to retrieve your examination result
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="flex items-center gap-3">
                  <Switch checked={autoRetryEnabled} onCheckedChange={setAutoRetryEnabled} />
                  <Label className="text-sm">Auto retry when server is down</Label>
                </div>
                {autoRetryEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="parallelCount">Parallel attempts</Label>
                    <Input
                      id="parallelCount"
                      type="number"
                      min={1}
                      max={10}
                      value={parallelCount}
                      onChange={(e) => setParallelCount(Math.max(1, Math.min(10, parseInt(e.target.value || ""))))}
                    />
                  </div>
                )}
              </div>
              <ResultForm onSubmit={fetchResult} isLoading={isLoading} />
            </CardContent>
          </Card>

          {/* Results Section */}
          {error && <ErrorDisplay message={error} onRetry={handleRetry} />}
          {result && <ResultDisplay data={result} />}

          {/* Empty State */}
          {!result && !error && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium">No result to display</p>
              <p className="text-sm">Enter your details above and click "Get Result" to fetch your result.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6 text-center text-sm text-muted-foreground">
        <p>Results are fetched directly from BEU official servers</p>
      </footer>
    </div>
  );
};

export default Index;
