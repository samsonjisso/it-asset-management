import type { Department, IPAddress } from '../../../../lib/supabase';

export type DepartmentFilterId = string | 'unallocated' | null;

export function isIpAllocated(record: IPAddress): boolean {
  return Boolean(
    record.related_assets?.pc ||
    record.related_assets?.device ||
    record.related_assets?.server,
  );
}

export function buildDepartmentCounts(
  records: IPAddress[],
  departments: Department[],
) {
  return [
    {
      id: null as null,
      name: 'All Departments',
      count: records.length,
    },
    ...departments.map((department) => ({
      id: department.id,
      name: department.name,
      count: records.filter(
        (record) => record.department_id === department.id,
      ).length,
    })),
    {
      id: 'unallocated' as const,
      name: 'Unallocated',
      count: records.filter(
        (record) => !isIpAllocated(record),
      ).length,
    },
  ];
}

export function filterIPRecords(
  records: IPAddress[],
  selectedDepartmentId: DepartmentFilterId,
): IPAddress[] {
  if (selectedDepartmentId === null) {
    return records;
  }

  if (selectedDepartmentId === 'unallocated') {
    return records.filter((record) => !isIpAllocated(record));
  }

  return records.filter(
    (record) => record.department_id === selectedDepartmentId,
  );
}