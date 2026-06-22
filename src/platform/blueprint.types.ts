import { CapabilityKey, EntityTypeKey, VerticalKey } from './blueprint-registry.constants';

export interface BlueprintWorkflowStep {
  key: string;
  label: string;
  required: boolean;
}

export interface BlueprintEntityContract {
  entityType: EntityTypeKey;
  requiredFields: string[];
  optionalFields?: string[];
  capabilities: CapabilityKey[];
  workflow: BlueprintWorkflowStep[];
}

export interface BlueprintSchema {
  key: string;
  version: 'v1';
  vertical: VerticalKey;
  displayName: string;
  capabilities: CapabilityKey[];
  entityContracts: BlueprintEntityContract[];
}
