import { Building2 } from 'lucide-react';
import type { DepartmentFilterId } from '../utils/ipFilters';

type DepartmentCount = {
  id: DepartmentFilterId;
  name: string;
  count: number;
};

type IPDepartmentFilterProps = {
  departments: DepartmentCount[];
  selectedDepartmentId: DepartmentFilterId;
  onSelect: (id: DepartmentFilterId) => void;
};

export function IPDepartmentFilter({
  departments,
  selectedDepartmentId,
  onSelect,
}: IPDepartmentFilterProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={17} className="text-brand-600" />

        <h2 className="text-sm font-semibold text-gray-700">
          Filter by Department
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {departments.map((department) => {
          const selected =
            selectedDepartmentId === department.id;

          return (
            <button
              key={department.id ?? 'all'}
              type="button"
              onClick={() => onSelect(department.id)}
              aria-pressed={selected}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                selected
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                  : 'border-gray-100 bg-white shadow-card hover:border-brand-200 hover:bg-brand-50/40'
              }`}
            >
              <p
                className={`text-xs font-medium truncate ${
                  selected
                    ? 'text-brand-700'
                    : 'text-gray-500'
                }`}
              >
                {department.name}
              </p>

              <p className="text-2xl font-bold text-gray-900 mt-1">
                {department.count}
              </p>

              <p className="text-xs text-gray-400">
                IP addresses
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}