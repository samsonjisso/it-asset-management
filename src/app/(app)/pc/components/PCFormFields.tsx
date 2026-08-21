import type { Department, AssetModel } from "@/lib/supabase";
import type { PCFormData } from "../types/pcRegistration.types";
import { PCBasicFields } from "./fields/PCBasicFields";
import { PCNetworkFields } from "./fields/PCNetworkFields";
import { PCLocationFields } from "./fields/PCLocationFields";

type Props = {
  form: PCFormData;
  departments: Department[];
  pcModels: AssetModel[];
  skipAssetTag: boolean;
  skipFloor: boolean;
  onChange: <K extends keyof PCFormData>(
    field: K,
    value: PCFormData[K],
  ) => void;
  onToggleAssetTag: () => void;
  onToggleFloor: () => void;
  onSelectModel: (id: string) => void;
};

export function PCFormFields(props: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <PCBasicFields
        form={props.form}
        skipAssetTag={props.skipAssetTag}
        onChange={props.onChange}
        onToggleAssetTag={props.onToggleAssetTag}
      />
      <PCNetworkFields form={props.form} onChange={props.onChange} />
      <PCLocationFields
        form={props.form}
        departments={props.departments}
        pcModels={props.pcModels}
        skipFloor={props.skipFloor}
        onChange={props.onChange}
        onToggleFloor={props.onToggleFloor}
        onSelectModel={props.onSelectModel}
      />
    </div>
  );
}
