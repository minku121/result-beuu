import { useEffect, useRef, useState } from "react";
import { ResultForm, FetchMode } from "@/components/ResultForm";
import { ResultDisplay } from "@/components/ResultDisplay";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Sparkles, FileText, FileImage, StopCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getEndpoint } from "@/config/endpoints";
import { normalizeResult } from "@/lib/normalizeResult";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const commonBranchCodes = ["101", "102", "103", "104", "105", "106", "110", "111", "155", "156", "157", "158", "162"];

const Index = () => {
  const [result, setResult] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
  const [lastParams, setLastParams] = useState<any>(null);
  const { toast } = useToast();
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryLoopActiveRef = useRef(false);
  const batchActiveRef = useRef(false);
  const [parallelCount, setParallelCount] = useState(5);
  const currentParamsRef = useRef<any>(null);
  const autoRetryEnabledAtSubmitRef = useRef(false);
  const [retryActive, setRetryActive] = useState(false);
  const [retryStats, setRetryStats] = useState<{ sent: number; failed: number; pending: number }>({ sent: 0, failed: 0, pending: 0 });

  const cancelRetryLoop = () => {
    retryLoopActiveRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setRetryActive(false);
    setRetryStats((s) => ({ ...s, pending: 0 }));
  };

  const stopBatch = () => {
    batchActiveRef.current = false;
    setIsBatchLoading(false);
    toast({ title: "Fetching stopped", description: "Batch fetching process has been cancelled." });
  };

  const singleAttempt = async (params: { session: string; redg_no: string; semester: number; }, i: number) => {
    const resolver = getEndpoint(params.session, params.semester);
    if (!resolver) return null;
    const { url, init } = resolver(params.redg_no);
    const finalUrl = url + (url.includes("?") ? `&__ts=${Date.now()}_${i}_${Math.random()}` : `?__ts=${Date.now()}_${i}_${Math.random()}`);
    try {
      setRetryStats((s) => ({ ...s, sent: s.sent + 1, pending: s.pending + 1 }));
      const resp = await fetch(finalUrl, init);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const data = await resp.json();
      if (data?.error || data?.status === "error") throw new Error(data.message || data.error || "Failed");
      const normalized = normalizeResult(params.session, params.semester, params.redg_no, data);
      const hasName = normalized?.data?.name && String(normalized.data.name).trim().length > 0;
      if (!hasName) throw new Error("Incomplete");
      setRetryStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }));
      return normalized;
    } catch {
      setRetryStats((s) => ({ ...s, failed: s.failed + 1, pending: Math.max(0, s.pending - 1) }));
      return null;
    }
  };

  const startAggressiveParallelRetry = (params: { session: string; redg_no: string; semester: number; }) => {
    if (!autoRetryEnabled) return;
    if (retryLoopActiveRef.current) return;
    retryLoopActiveRef.current = true;
    setRetryActive(true);
    setRetryStats({ sent: 0, failed: 0, pending: 0 });
    toast({ title: "Auto fetching started", description: `Running ${Math.max(1, parallelCount)} parallel attempts` });
    const slots = Math.max(1, Math.min(5, parallelCount));
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
      setRetryActive(false);
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

  const fetchBatchResults = async (params: {
    mode: FetchMode;
    session: string;
    semester: number;
    regNo?: string;
    branchCode?: string;
    collegeCode?: string;
  }) => {
    setIsBatchLoading(true);
    setResults([]);
    setError(null);
    batchActiveRef.current = true;

    const yearPrefix = params.session.substring(2, 4);
    let branchCodesToFetch: string[] = [];
    let collegeCode = params.collegeCode || "";

    if (params.mode === "branch") {
      if (params.regNo) {
        branchCodesToFetch = [params.regNo.substring(2, 5)];
        collegeCode = params.regNo.substring(5, 8);
      } else if (params.branchCode) {
        branchCodesToFetch = [params.branchCode];
      }
    } else if (params.mode === "college") {
      branchCodesToFetch = commonBranchCodes;
    }

    const fetchedResults: any[] = [];
    let totalSuccess = 0;
    let totalFail = 0;

    for (const bCode of branchCodesToFetch) {
      if (!batchActiveRef.current) break;

      let consecutiveFails = 0;
      for (let i = 1; i <= 150; i++) {
        if (!batchActiveRef.current) break;
        if (consecutiveFails >= 10) break;

        const rollNo = i.toString().padStart(3, "0");
        const currentRegNo = `${yearPrefix}${bCode}${collegeCode}${rollNo}`;

        setBatchProgress({
          current: i,
          total: branchCodesToFetch.length * 150,
          success: totalSuccess,
          fail: totalFail,
        });

        const res = await singleAttempt(
          { session: params.session, semester: params.semester, redg_no: currentRegNo },
          i
        );

        if (res) {
          fetchedResults.push(res);
          setResults([...fetchedResults]);
          totalSuccess++;
          consecutiveFails = 0;
        } else {
          totalFail++;
          consecutiveFails++;
        }

        await new Promise((r) => setTimeout(r, 100));
      }
    }

    setIsBatchLoading(false);
    batchActiveRef.current = false;

    if (fetchedResults.length > 0) {
      toast({
        title: "Batch Fetch Complete",
        description: `Successfully fetched ${fetchedResults.length} results.`,
      });
    } else {
      setError("No results found for the specified criteria.");
    }
  };

  const handleSubmit = (params: any) => {
    setLastParams(params);
    if (params.mode === "single") {
      fetchResult({ session: params.session, redg_no: params.regNo, semester: params.semester });
    } else {
      fetchBatchResults(params);
    }
  };

  const fetchResult = async (params: { session: string; redg_no: string; semester: number }) => {
    cancelRetryLoop();
    currentParamsRef.current = params;
    autoRetryEnabledAtSubmitRef.current = autoRetryEnabled;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setResults([]);

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
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

      const data = await response.json();
      if (data?.error || data?.status === "error") {
        throw new Error(data.message || data.error || "Failed to fetch result");
      }

      const normalized = normalizeResult(params.session, params.semester, params.redg_no, data);
      const hasName = normalized?.data?.name && String(normalized.data.name).trim().length > 0;

      if (!hasName) {
        const autoOn = autoRetryEnabledAtSubmitRef.current;
        if (autoOn) {
          const msg = "Server returned incomplete data (missing name). Auto retrying...";
          setError(msg);
          toast({ title: "Server slow", description: msg, variant: "destructive" });
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          startAggressiveParallelRetry(params);
        } else {
          const msg = "Server returned incomplete data (missing name). Please try again.";
          setError(msg);
          toast({ title: "Unable to fetch", description: msg, variant: "destructive" });
        }
        return;
      }

      setResult(normalized);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      toast({ title: "Result fetched successfully", description: "Your examination result has been retrieved." });
    } catch (err: any) {
      const errorMessage = err.message || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      if (autoRetryEnabledAtSubmitRef.current) {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        startAggressiveParallelRetry(params);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastParams) handleSubmit(lastParams);
  };

  // ─── Export helpers ────────────────────────────────────────────────────────

  const getTableRows = () =>
    results.map((r) => {
      const semStr = r.data.semester;
      const romanToNum: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
      const semNum = Number.isNaN(parseInt(semStr))
        ? romanToNum[semStr.toUpperCase()] ?? null
        : parseInt(semStr);
      const sgpa = semNum && r.data.sgpa?.[semNum - 1] ? r.data.sgpa[semNum - 1] : "N/A";
      return [
        r.data.redg_no,
        r.data.name,
        r.data.course || "N/A",
        String(sgpa),
        String(r.data.cgpa || "N/A"),
        r.data.fail_any,
      ];
    });

  const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  const exportToPDF = async () => {
    if (results.length === 0) return;
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: "landscape" });

      // Title
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("BEU Examination Results", 14, 16);

      // Subtitle
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Session: ${lastParams?.session}  |  Semester: ${lastParams?.semester}  |  Total Students: ${results.length}  |  Generated: ${new Date().toLocaleString()} | Visit https://result-beuu.vercel.app/ or  for more details`,
        14,
        23
      );

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 26, 283, 26);

      (doc as any).autoTable({
        head: [["Reg No", "Name", "Course", "SGPA", "CGPA", "Result"]],
        body: getTableRows(),
        startY: 30,
        styles: { fontSize: 9, cellPadding: 3.5, font: "helvetica" },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
          0: { cellWidth: 38, font: "courier" },
          1: { cellWidth: 60 },
          2: { cellWidth: 48 },
          3: { cellWidth: 22, halign: "center", fontStyle: "bold" },
          4: { cellWidth: 22, halign: "center", fontStyle: "bold" },
          5: { cellWidth: 26, halign: "center", fontStyle: "bold" },
        },
        didParseCell: (data: any) => {
          if (data.column.index === 5 && data.section === "body") {
            const val = data.cell.raw as string;
            data.cell.styles.textColor = val === "PASS" ? [22, 163, 74] : [220, 38, 38];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `Page ${i} of ${pageCount}  —  BEU Result Portal`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save(`BEU_Results_${lastParams?.session}_Sem${lastParams?.semester}.pdf`);
      toast({ title: "PDF exported", description: "Your results have been saved as a PDF." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const exportToJPG = async () => {
    if (results.length === 0) return;
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");

      const tableEl = document.querySelector(".batch-results-table") as HTMLElement;
      if (!tableEl) {
        toast({ title: "Error", description: "Table element not found.", variant: "destructive" });
        return;
      }

      const canvas = await (window as any).html2canvas(tableEl, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      // Add a small header banner above the table capture
      const headerHeight = 60;
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height + headerHeight * 2;
      const ctx = finalCanvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Header bar
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(0, 0, finalCanvas.width, headerHeight * 2);

      // Header text
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${36 * 2}px sans-serif`;
      ctx.fillText("BEU Examination Results", 40, 55 * 2);
      ctx.font = `${14 * 2}px sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(
        `Session: ${lastParams?.session}  |  Semester: ${lastParams?.semester}  |  ${results.length} Students`,
        40,
        80 * 2
      );

      // Draw captured table below header
      ctx.drawImage(canvas, 0, headerHeight * 2);

      const link = document.createElement("a");
      link.download = `BEU_Results_${lastParams?.session}_Sem${lastParams?.semester}.jpg`;
      link.href = finalCanvas.toDataURL("image/jpeg", 0.95);
      link.click();

      toast({ title: "JPG exported", description: "Your results have been saved as an image." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

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
      batchActiveRef.current = false;
    };
  }, [autoRetryEnabled]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">BEU Results</h1>
              <p className="text-xs text-muted-foreground">Bihar Engineering University</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid gap-8">
          {/* Welcome Section */}
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              <Sparkles className="h-3 w-3" />
              <span>Enhanced Result Portal</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Check Your Examination Result
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your registration details below to retrieve your academic performance records from the official database.
            </p>
          </section>

          {/* Form Card */}
          <Card className="shadow-card border-0 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle>Retrieve Result</CardTitle>
              <CardDescription>Select your session and enter registration number</CardDescription>
            </CardHeader>
            <CardContent>
              <ResultForm onSubmit={handleSubmit} isLoading={isLoading || isBatchLoading} />

              <div className="mt-8 pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Retry (Parallel)</Label>
                    <p className="text-sm text-muted-foreground">Automatically retry if server is slow or fails</p>
                  </div>
                  <Switch checked={autoRetryEnabled} onCheckedChange={setAutoRetryEnabled} />
                </div>

                {autoRetryEnabled && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Label>Parallel Threads</Label>
                        <span className="text-muted-foreground font-mono">{parallelCount}</span>
                      </div>
                      <Input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={parallelCount}
                        onChange={(e) => setParallelCount(parseInt(e.target.value))}
                        className="h-2"
                      />
                    </div>
                  </div>
                )}

                {retryActive && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-primary flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Retrying...
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelRetryLoop}>
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider font-bold">
                      <div className="text-center p-1 bg-background rounded border border-border">
                        <span className="block text-muted-foreground">Sent</span>
                        <span className="text-primary">{retryStats.sent}</span>
                      </div>
                      <div className="text-center p-1 bg-background rounded border border-border">
                        <span className="block text-muted-foreground">Failed</span>
                        <span className="text-destructive">{retryStats.failed}</span>
                      </div>
                      <div className="text-center p-1 bg-background rounded border border-border">
                        <span className="block text-muted-foreground">Active</span>
                        <span className="text-emerald-500">{retryStats.pending}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Batch Progress */}
          {isBatchLoading && (
            <Card className="shadow-card border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Fetching Batch Results</CardTitle>
                  <Button variant="destructive" size="sm" onClick={stopBatch} className="gap-2">
                    <StopCircle className="h-4 w-4" /> Stop
                  </Button>
                </div>
                <CardDescription>Processing registration numbers for the selected criteria...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Progress</span>
                    <span>{results.length} results found</span>
                  </div>
                  <Progress value={(results.length / batchProgress.total) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Success</p>
                      <p className="text-xl font-bold text-emerald-600">{batchProgress.success}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Failed</p>
                      <p className="text-xl font-bold text-red-600">{batchProgress.fail}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch Results Table */}
          {results.length > 0 && (
            <Card className="shadow-card border-0 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30">
                <div>
                  <CardTitle>Batch Results</CardTitle>
                  <CardDescription>Showing {results.length} students</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportToPDF} variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" /> Export PDF
                  </Button>
                  <Button onClick={exportToJPG} variant="outline" className="gap-2">
                    <FileImage className="h-4 w-4" /> Export JPG
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto batch-results-table">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reg No</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                        <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">SGPA</th>
                        <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">CGPA</th>
                        <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Result</th>
                        <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {results.map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-mono">{r.data.redg_no}</td>
                          <td className="py-3 px-4 text-sm font-medium">{r.data.name}</td>
                          <td className="py-3 px-4 text-sm text-center font-bold text-primary">
                            {(() => {
                              const semStr = r.data.semester;
                              const romanToNum: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
                              const semNum = Number.isNaN(parseInt(semStr))
                                ? romanToNum[semStr.toUpperCase()] ?? null
                                : parseInt(semStr);
                              return semNum && r.data.sgpa?.[semNum - 1] ? r.data.sgpa[semNum - 1] : "N/A";
                            })()}
                          </td>
                          <td className="py-3 px-4 text-sm text-center font-bold">{r.data.cgpa}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={r.data.fail_any === "PASS" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}
                              variant="outline"
                            >
                              {r.data.fail_any}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResult(r);
                                window.scrollTo({
                                  top: document.getElementById("result-display")?.offsetTop || 0,
                                  behavior: "smooth",
                                });
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          <div id="result-display">
            {error && <ErrorDisplay message={error} onRetry={handleRetry} />}
            {result && <ResultDisplay data={result} />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} BEU Result Portal. Data provided by Bihar Engineering University.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;