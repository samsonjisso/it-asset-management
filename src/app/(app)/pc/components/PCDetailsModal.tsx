import { Monitor } from "lucide-react";
import type { AssetModel, PCRegistration } from "@/lib/supabase";
import { DetailsModal } from "@/components/DetailsModal";
import { buildPCDetails } from "../utils/pcDetails";

type Props = {
  viewing: PCRegistration | null;
  pcModels: AssetModel[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: (record: PCRegistration) => void;
};

export function PCDetailsModal({
  viewing,
  pcModels,
  canEdit,
  onClose,
  onEdit,
}: Props) {
  return (
    <DetailsModal
      open={!!viewing}
      onClose={onClose}
      title={viewing?.hostname ?? ""}
      subtitle={viewing?.asset_id ?? undefined}
      icon={<Monitor size={22} />}
      sections={viewing ? buildPCDetails(viewing, pcModels) : []}
      onEdit={viewing && canEdit ? () => onEdit(viewing) : undefined}
      editLabel="Edit PC"
    />
  );
}
