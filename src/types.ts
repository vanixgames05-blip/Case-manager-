export enum CaseNature {
  CIVIL = 'Civil',
  CRIMINAL = 'Criminal',
}

export interface CaseHistory {
  date: string;
  proceedings: string;
  nextDate: string;
  stage: string;
}

export interface Case {
  id: string;
  title: string;
  caseNumber: string;
  year: number;
  nature: CaseNature;
  caseType?: string; // e.g., "Suit for Specific Performance"
  representing?: string; // e.g., "Plaintiff", "Defendant"
  courtName: string;
  currentStage: string;
  diaryNotes: string;
  nextDate: string; // ISO string date
  history: CaseHistory[];
  firNumber?: string;
  policeStation?: string;
  offence?: string; // Changed from OffenceType enum
  status: 'Pending' | 'Decided';
}

export type View = 'calendar' | 'add_case' | 'drafting' | 'search' | 'data';