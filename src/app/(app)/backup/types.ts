export interface BackupTable {
  name: string;
  label: string;
}

export type TableRow = Record<string, any>;

export interface TableDataMap {
  [label: string]: TableRow[];
}
