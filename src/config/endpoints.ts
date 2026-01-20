export type EndpointRequest = {
  url: string;
  init?: RequestInit;
};

type EndpointResolver = (regNo: string) => EndpointRequest;

const endpointMap: Record<string, Record<number, EndpointResolver>> = {
  "2024-28": {
    1: (regNo) => ({
      url: `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&redg_no=${encodeURIComponent(regNo)}&semester=I&exam_held=May/2025`,
    }),
    2: (regNo) => ({
      url: `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&redg_no=${encodeURIComponent(regNo)}&semester=II&exam_held=November/2025`,
    }),
   
  },




  "2023-27": {
   
    3: (regNo) => ({
      url: `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&redg_no=${encodeURIComponent(regNo)}&semester=III&exam_held=July/2025`,
    }),
  },





  "2022-26": {
    5: (regNo) => ({
      url: `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&redg_no=${encodeURIComponent(regNo)}&semester=V&exam_held=July/2025`,
    }),
  },



  
  "2021-25": {},
};

export function getEndpoint(session: string, semester: number): EndpointResolver | null {
  return endpointMap[session]?.[semester] ?? null;
}

export function getAvailableSemesters(session: string): number[] {
  const map = endpointMap[session];
  if (!map) return [];
  return Object.keys(map)
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}
