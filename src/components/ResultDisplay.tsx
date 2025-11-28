import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, User, BookOpen, Calendar, Award, FileText, Users, Building2, Beaker } from "lucide-react";

interface Subject {
  code: string;
  name: string;
  ese: string;
  ia: string;
  total: string;
  grade: string;
  credit: string;
}

interface ResultData {
  semester: string;
  exam_held: string;
  redg_no: string;
  name: string;
  father_name: string;
  mother_name: string;
  college_code: string;
  college_name: string;
  course_code: string;
  course: string;
  examYear: string;
  theorySubjects: Subject[];
  practicalSubjects: Subject[];
  sgpa: (string | null)[];
  cgpa: string;
  fail_any: string;
}

interface ResultDisplayProps {
  data: {
    status: number;
    message: string;
    data: ResultData;
  };
}

const gradeColors: Record<string, string> = {
  "A+": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "A": "bg-green-500/10 text-green-600 border-green-500/20",
  "B": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "C": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "D": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "P": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  "F": "bg-red-500/10 text-red-600 border-red-500/20",
};

export function ResultDisplay({ data }: ResultDisplayProps) {
  if (!data || !data.data) return null;

  const result = data.data;
  const romanToNum: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  const semStr = String(result.semester || "").toUpperCase();
  const semNum = Number.isNaN(parseInt(semStr)) ? romanToNum[semStr] ?? null : parseInt(semStr);
  const currentSgpa = semNum && result.sgpa?.[semNum - 1] ? result.sgpa[semNum - 1] : "N/A";

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Student Info Card */}
      <Card className="shadow-card border-0 overflow-hidden">
        <CardHeader className="gradient-bg pb-6">
          <CardTitle className="flex items-center gap-3 text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={<User className="h-4 w-4" />} label="Name" value={result.name} />
            <InfoItem icon={<FileText className="h-4 w-4" />} label="Registration No" value={result.redg_no} />
            <InfoItem icon={<Users className="h-4 w-4" />} label="Father's Name" value={result.father_name} />
            <InfoItem icon={<Users className="h-4 w-4" />} label="Mother's Name" value={result.mother_name} />
            <InfoItem icon={<BookOpen className="h-4 w-4" />} label="Course" value={result.course} />
            <InfoItem icon={<Building2 className="h-4 w-4" />} label="College" value={result.college_name} />
          </div>
        </CardContent>
      </Card>

      {/* Result Summary Card */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Award className="h-5 w-5 text-primary" />
            Result Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Semester</p>
              <p className="text-lg font-semibold text-foreground">{result.semester}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Exam Session</p>
              <p className="text-lg font-semibold text-foreground">{result.exam_held}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Exam Year</p>
              <p className="text-lg font-semibold text-foreground">{result.examYear}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">SGPA</p>
              <p className="text-2xl font-bold gradient-text">{currentSgpa}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">CGPA</p>
              <p className="text-2xl font-bold gradient-text">{result.cgpa}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Badge 
              className={`text-base px-6 py-2 ${
                result.fail_any === 'PASS' 
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}
            >
              {result.fail_any}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Theory Subjects Table */}
      {result.theorySubjects && result.theorySubjects.length > 0 && (
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              Theory Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Subject</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">ESE</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">IA</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Credit</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {result.theorySubjects.map((subject, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                        {subject.code}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground max-w-[200px]">
                        {subject.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {subject.ese}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {subject.ia}
                      </td>
                      <td className="py-3 px-4 text-sm text-center font-semibold text-foreground">
                        {subject.total}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {subject.credit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          variant="outline" 
                          className={`font-mono font-semibold ${gradeColors[subject.grade] || 'bg-secondary'}`}
                        >
                          {subject.grade}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practical Subjects Table */}
      {result.practicalSubjects && result.practicalSubjects.length > 0 && (
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Beaker className="h-5 w-5 text-accent" />
              Practical Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Subject</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">ESE</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">IA</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Credit</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {result.practicalSubjects.map((subject, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                        {subject.code}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-foreground max-w-[200px]">
                        {subject.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {subject.ese}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {subject.ia}
                      </td>
                      <td className="py-3 px-4 text-sm text-center font-semibold text-foreground">
                        {subject.total}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-muted-foreground">
                        {subject.credit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          variant="outline" 
                          className={`font-mono font-semibold ${gradeColors[subject.grade] || 'bg-secondary'}`}
                        >
                          {subject.grade}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SGPA History */}
      {result.sgpa && result.sgpa.some(s => s !== null) && (
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              Semester-wise SGPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {result.sgpa.map((sgpa, index) => (
                <div 
                  key={index} 
                  className={`rounded-xl p-3 text-center ${
                    sgpa ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">Sem {index + 1}</p>
                  <p className={`text-lg font-bold ${sgpa ? 'gradient-text' : 'text-muted-foreground'}`}>
                    {sgpa || '-'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="text-primary mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}
