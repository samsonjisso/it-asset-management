import { useCallback, useEffect, useState } from "react";
import type { AssetModel, Department, PCRegistration } from "@/lib/supabase";
import {
  fetchDepartments,
  fetchPCModels,
  fetchPCRegistrations,
} from "../services/pcRegistrationService";

export function usePCData() {
  const [records, setRecords] = useState<PCRegistration[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pcModels, setPcModels] = useState<AssetModel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pcRes, deptRes, modelsRes] = await Promise.all([
        fetchPCRegistrations(),
        fetchDepartments(),
        fetchPCModels(),
      ]);
      if (pcRes.data) setRecords(pcRes.data as PCRegistration[]);
      if (deptRes.data) setDepartments(deptRes.data as Department[]);
      if (modelsRes.data) {
        setPcModels(
          (modelsRes.data as AssetModel[]).filter(
            (model) => model.target === "pc",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { records, departments, pcModels, loading, reload: loadData };
}
