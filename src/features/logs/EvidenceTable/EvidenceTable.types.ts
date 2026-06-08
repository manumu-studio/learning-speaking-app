// Props for the generic evidence table component
export interface EvidenceTableColumn {
  key: string;
  label: string;
}

export interface EvidenceTableProps {
  title: string;
  columns: EvidenceTableColumn[];
  rows: Record<string, string | number | null>[];
}
