export type SubAgentRole = "ENGINEER" | "LEGAL" | "ECOLOGIST";

export type SectionStatus = "NEEDS_DATA" | "AI_DRAFT" | "APPROVED";

export interface QuestionnaireField {
  id: string;
  label: string;
  placeholder?: string;
  unit?: string;
  defaultValue?: string | number;
  hint?: string;
  type?: "text" | "number" | "select";
  options?: string[];
}

export interface ProjectSubSection {
  id: string;
  code: string; // e.g., "1.1", "2.3"
  title: string;
  responsibleAgent: SubAgentRole;
  status: SectionStatus;
  summary: string;
  normativeBase: string[];
  content: string; // Markdown or rich structured text
  agentExplanation: string; // Agent rationale & legal/technical justification
  interviewQuestions?: QuestionnaireField[]; // Structured questions asked by the subagent
  parameters?: Record<string, string | number>;
  revisionsCount?: number;
}

export interface ProjectCategory {
  id: string;
  code: string; // "Раздел 1", "Раздел 2"
  title: string;
  description: string;
  subsections: ProjectSubSection[];
}

export interface MiningProjectMetadata {
  id: string;
  title: string;
  licenseCode: string;
  depositName: string;
  mineralType: string; // Общераспространенные полезные ископаемые (ОПИ): Песок, гравий, щебень, глина
  holderCompany: string;
  region: string;
  subsoilPlotAreaHa: number;
  annualCapacityThousandM3: number;
  strippingRatio: number; // Коэффициент вскрыши м3/м3
  quarryDepthM: number;
  groundwaterLevelM: number;
  currentAgentFilter?: SubAgentRole | "ALL";
}
