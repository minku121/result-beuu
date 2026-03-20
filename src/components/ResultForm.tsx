import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { getAvailableSemesters } from "@/config/endpoints";

interface ResultFormProps {
  onSubmit: (params: {
    session: string;
    redg_no: string;
    semester: number;
  }) => void;
  isLoading: boolean;
}

const sessions = ["2025-29", "2024-28", "2023-27", "2022-26", "2021-25"];
const semestersNumeric = [1, 2, 3, 4, 5, 6, 7, 8];

export function ResultForm({ onSubmit, isLoading }: ResultFormProps) {
  const [session, setSession] = useState("");
  const [regNo, setRegNo] = useState("");
  const [semester, setSemester] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !semester) return;
    onSubmit({
      session,
      redg_no: regNo,
      semester,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="regNo" className="text-sm font-medium text-foreground">
            Registration Number
          </Label>
          <Input
            id="regNo"
            type="text"
            value={regNo}
            onChange={(e) => setRegNo(e.target.value)}
            placeholder="Enter registration number"
            className="h-11 font-mono"
            required
          />
        </div>

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
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={isLoading || !session || !semester}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            Fetching Result...
          </>
        ) : (
          <>
            <Search />
            Get Result
          </>
        )}
      </Button>
    </form>
  );
}
