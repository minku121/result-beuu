import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Users, User, School } from "lucide-react";
import { getAvailableSemesters } from "@/config/endpoints";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type FetchMode = "single" | "branch" | "college";

interface ResultFormProps {
  onSubmit: (params: {
    mode: FetchMode;
    session: string;
    semester: number;
    regNo?: string;
    branchCode?: string;
    collegeCode?: string;
  }) => void;
  isLoading: boolean;
}

const sessions = ["2025-29", "2024-28", "2023-27", "2022-26", "2021-25"];
const semestersNumeric = [1, 2, 3, 4, 5, 6, 7, 8];

export function ResultForm({ onSubmit, isLoading }: ResultFormProps) {
  const [mode, setMode] = useState<FetchMode>("single");
  const [session, setSession] = useState("");
  const [regNo, setRegNo] = useState("");
  const [semester, setSemester] = useState<number | null>(null);
  
  // Branch/College specific states
  const [branchCode, setBranchCode] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [branchInputMode, setBranchInputMode] = useState<"reg" | "manual">("reg");

  // Auto-extract from regNo for branch mode if in "reg" sub-mode
  useEffect(() => {
    if (mode === "branch" && branchInputMode === "reg" && regNo.length >= 8) {
      // 23 155 134 013
      // YY BBB CCC RRR
      const extractedBranch = regNo.substring(2, 5);
      const extractedCollege = regNo.substring(5, 8);
      if (extractedBranch.length === 3) setBranchCode(extractedBranch);
      if (extractedCollege.length === 3) setCollegeCode(extractedCollege);
      
      const yearPrefix = regNo.substring(0, 2);
      const foundSession = sessions.find(s => s.startsWith("20" + yearPrefix));
      if (foundSession) setSession(foundSession);
    }
  }, [regNo, mode, branchInputMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !semester) return;
    
    onSubmit({
      mode,
      session,
      semester,
      regNo: mode === "single" || (mode === "branch" && branchInputMode === "reg") ? regNo : undefined,
      branchCode: mode === "branch" ? branchCode : undefined,
      collegeCode: mode === "branch" || mode === "college" ? collegeCode : undefined,
    });
  };

  const isFormValid = () => {
    if (!session || !semester) return false;
    if (mode === "single") return regNo.length > 0;
    if (mode === "branch") {
      if (branchInputMode === "reg") return regNo.length >= 8;
      return branchCode.length === 3 && collegeCode.length === 3;
    }
    if (mode === "college") return collegeCode.length === 3;
    return false;
  };

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as FetchMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Single</span>
          </TabsTrigger>
          <TabsTrigger value="branch" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Branch</span>
          </TabsTrigger>
          <TabsTrigger value="college" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            <span className="hidden sm:inline">College</span>
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Common Session Field */}
            <div className="space-y-2">
              <Label htmlFor="session" className="text-sm font-medium text-foreground">
                Session
              </Label>
              <Select value={session} onValueChange={(val) => { setSession(val); setSemester(null); }}>
                <SelectTrigger id="session" className="h-11">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Common Semester Field (shown after session is selected) */}
            {session && (
              <div className="space-y-2">
                <Label htmlFor="semester" className="text-sm font-medium text-foreground">
                  Semester
                </Label>
                <Select value={semester?.toString() ?? ""} onValueChange={(v) => setSemester(parseInt(v))}>
                  <SelectTrigger id="semester" className="h-11">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {(getAvailableSemesters(session).length ? getAvailableSemesters(session) : semestersNumeric).map((s) => (
                      <SelectItem key={s} value={s.toString()}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mode Specific Fields */}
            {mode === "single" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="regNo" className="text-sm font-medium text-foreground">
                  Registration Number
                </Label>
                <Input
                  id="regNo"
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="Enter registration number (e.g., 23155134013)"
                  className="h-11 font-mono"
                  required
                />
              </div>
            )}

            {mode === "branch" && (
              <>
                <div className="sm:col-span-2 space-y-4">
                  <div className="flex items-center gap-4 mb-2">
                    <Button 
                      type="button" 
                      variant={branchInputMode === "reg" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBranchInputMode("reg")}
                    >
                      By Registration
                    </Button>
                    <Button 
                      type="button" 
                      variant={branchInputMode === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBranchInputMode("manual")}
                    >
                      Manual Codes
                    </Button>
                  </div>
                  
                  {branchInputMode === "reg" ? (
                    <div className="space-y-2">
                      <Label htmlFor="regNoBranch" className="text-sm font-medium text-foreground">
                        Reference Registration Number
                      </Label>
                      <Input
                        id="regNoBranch"
                        type="text"
                        value={regNo}
                        onChange={(e) => setRegNo(e.target.value)}
                        placeholder="Enter any student reg no from the branch"
                        className="h-11 font-mono"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll extract branch ({branchCode || "???"}) and college ({collegeCode || "???"}) from this.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="branchCode" className="text-sm font-medium text-foreground">
                          Branch Code
                        </Label>
                        <Input
                          id="branchCode"
                          type="text"
                          value={branchCode}
                          onChange={(e) => setBranchCode(e.target.value)}
                          placeholder="e.g. 155"
                          maxLength={3}
                          className="h-11 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="collegeCode" className="text-sm font-medium text-foreground">
                          College Code
                        </Label>
                        <Input
                          id="collegeCode"
                          type="text"
                          value={collegeCode}
                          onChange={(e) => setCollegeCode(e.target.value)}
                          placeholder="e.g. 134"
                          maxLength={3}
                          className="h-11 font-mono"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === "college" && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="collegeCodeOnly" className="text-sm font-medium text-foreground">
                  College Code
                </Label>
                <Input
                  id="collegeCodeOnly"
                  type="text"
                  value={collegeCode}
                  onChange={(e) => setCollegeCode(e.target.value)}
                  placeholder="Enter 3-digit college code (e.g. 134)"
                  maxLength={3}
                  className="h-11 font-mono"
                  required
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Fetching Results...
              </>
            ) : (
              <>
                <Search />
                {mode === "single" ? "Get Result" : mode === "branch" ? "Fetch Branch Results" : "Fetch College Results"}
              </>
            )}
          </Button>
        </form>
      </Tabs>
    </div>
  );
}
