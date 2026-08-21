import type {
  PCFormData,
  PCFormOptions,
  PCWritePayload,
} from "../types/pcRegistration.types";

export function buildPCPayload(
  form: PCFormData,
  options: PCFormOptions,
  registeredBy?: string,
): PCWritePayload {
  return {
    ...form,
    asset_tag: options.skipAssetTag ? null : form.asset_tag || null,
    floor_number: options.skipFloor ? null : form.floor_number || null,
    department_id: form.department_id || null,
    model_id: form.model_id || null,
    registered_by: registeredBy,
  };
}
