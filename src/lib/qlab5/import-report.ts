import type { QLabCueType } from "./types";

export interface SkippedCueEntry {
  number: string;
  name: string;
  type: QLabCueType;
  reason: string;
  listName: string;
}

export interface ImportWarning {
  message: string;
}

export interface ImportReport {
  importedCueCount: number;
  importedListCount: number;
  skippedCues: SkippedCueEntry[];
  missingAssets: string[];
  warnings: ImportWarning[];
}

export function createImportReport(): ImportReport {
  return {
    importedCueCount: 0,
    importedListCount: 0,
    skippedCues: [],
    missingAssets: [],
    warnings: [],
  };
}

export function skipCue(report: ImportReport, entry: Omit<SkippedCueEntry, never>): void {
  report.skippedCues.push(entry);
}

export function warnImport(report: ImportReport, message: string): void {
  report.warnings.push({ message });
}

export function hasImportIssues(report: ImportReport): boolean {
  return (
    report.skippedCues.length > 0 || report.missingAssets.length > 0 || report.warnings.length > 0
  );
}
