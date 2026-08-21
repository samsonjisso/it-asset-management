import { ReactNode } from "react";

export interface StatCardData {
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
  bg: string;
  href: string;
}

export interface MonthlyDataPoint {
  month: string;
  count: number;
}

export type DeviceTypeCounts = Record<string, number>;
export type ServerEnvCounts = Record<string, number>;

export type ServerEnvironment = "production" | "test" | "standby";
