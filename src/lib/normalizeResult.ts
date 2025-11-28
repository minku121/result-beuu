export function normalizeResult(session: string, semester: number, regNo: string, raw: any) {
  if (raw && typeof raw === "object" && "data" in raw && "status" in raw) {
    return raw;
  }

  const d = raw?.data ?? raw ?? {};

  return {
    status: raw?.status ?? 200,
    message: raw?.message ?? "OK",
    data: {
      semester: semester.toString(),
      exam_held: d?.exam_held ?? "",
      redg_no: d?.redg_no ?? regNo,
      name: d?.name ?? d?.student_name ?? "",
      father_name: d?.father_name ?? "",
      mother_name: d?.mother_name ?? "",
      college_code: d?.college_code ?? "",
      college_name: d?.college_name ?? "",
      course_code: d?.course_code ?? "",
      course: d?.course ?? "",
      examYear: d?.examYear ?? d?.exam_year ?? "",
      theorySubjects: d?.theorySubjects ?? d?.theory_subjects ?? [],
      practicalSubjects: d?.practicalSubjects ?? d?.practical_subjects ?? [],
      sgpa: d?.sgpa ?? [],
      cgpa: d?.cgpa ?? "",
      fail_any: d?.fail_any ?? d?.result ?? "",
    },
  };
}

