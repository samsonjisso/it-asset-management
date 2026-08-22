import { Check } from "lucide-react";
import { ImportWizardStep } from "../../types";

const STEPS: { key: ImportWizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Map Columns" },
  { key: "preview", label: "Preview" },
  { key: "result", label: "Import" },
];

export function WizardSteps({ current }: { current: ImportWizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center mb-6">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 ${
                  done
                    ? "bg-[#343494] text-white"
                    : active
                      ? "bg-[#343494]/10 text-[#343494] border-2 border-[#343494]"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  active
                    ? "text-[#343494]"
                    : done
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 ${done ? "bg-[#343494]" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
