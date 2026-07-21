export interface IcdCode {
  readonly code: string;
  readonly description: string;
}

// ponytail: deterministic subset from the supplied references; load the full
// ICD-10-CM table when this mock needs codes outside the captured journey.
export const ICD_CODES: readonly IcdCode[] = [
  { code: "O80", description: "Encounter for full-term uncomplicated delivery" },
  { code: "Z96.651", description: "Presence of right artificial knee joint" },
  { code: "Z96.652", description: "Presence of left artificial knee joint" },
  { code: "Z96.653", description: "Presence of artificial knee joint, bilateral" },
  { code: "M25.561", description: "Pain in right knee" },
  { code: "S83.511A", description: "Sprain of ACL of right knee, initial encounter" },
  { code: "E08.3532", description: "Diabetes mellitus due to underlying condition with retinopathy" },
  { code: "Z00.0", description: "General adult medical examination" },
];

export const describeDiagnosis = (code: string): string =>
  ICD_CODES.find((entry) => entry.code === code)?.description ?? "Description unavailable";
