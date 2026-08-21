// Shared types for the IP Subnet Management feature.

export interface SubnetFormState {
  prefix: string;
  label: string;
  notes: string;
}

export const emptySubnetForm: SubnetFormState = {
  prefix: '',
  label: '',
  notes: '',
};
