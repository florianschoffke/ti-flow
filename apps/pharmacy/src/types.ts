export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  insuranceNumber: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  quantity: number;
  doctor: string;
  doctorLanr?: string; // Added LANR field
  issueDate: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  compositionType: string;
}

// Enhanced FHIR types for complete prescription handling
export interface FhirBundle {
  id: string;
  prescriptionId: string;
  timestamp: string;
  entries: FhirEntry[];
}

export interface FhirEntry {
  fullUrl: string;
  resource: FhirResource;
}

export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier: FhirIdentifier[];
  name: FhirHumanName[];
  birthDate: string;
  address: FhirAddress[];
}

export interface FhirMedication extends FhirResource {
  resourceType: 'Medication';
  code: FhirCodeableConcept;
  form?: FhirCodeableConcept;
  ingredient?: FhirIngredient[];
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status: string;
  intent: string;
  medicationReference: FhirReference;
  subject: FhirReference;
  requester: FhirReference;
  authoredOn: string;
  dosageInstruction: FhirDosage[];
  dispenseRequest: FhirDispenseRequest;
  substitution: FhirSubstitution;
}

export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier: FhirIdentifier[];
  name: FhirHumanName[];
  qualification: FhirQualification[];
}

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  identifier: FhirIdentifier[];
  name: string;
  telecom: FhirContactPoint[];
  address: FhirAddress[];
}

export interface FhirComposition extends FhirResource {
  resourceType: 'Composition';
  status: string;
  type: FhirCodeableConcept;
  subject: FhirReference;
  date: string;
  author: FhirReference[];
  title: string;
  custodian: FhirReference;
}

// Supporting types
export interface FhirIdentifier {
  type?: FhirCodeableConcept;
  system: string;
  value: string;
}

export interface FhirHumanName {
  use: string;
  family: string;
  given: string[];
  prefix?: string[];
}

export interface FhirAddress {
  type: string;
  line: string[];
  city: string;
  postalCode: string;
  country: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirReference {
  reference: string;
  type?: string;
}

export interface FhirIngredient {
  itemCodeableConcept: FhirCodeableConcept;
  strength: FhirRatio;
}

export interface FhirRatio {
  numerator: FhirQuantity;
  denominator: FhirQuantity;
}

export interface FhirQuantity {
  value: number;
  unit: string;
}

export interface FhirDosage {
  extension?: any[];
  text?: string;
}

export interface FhirDispenseRequest {
  quantity: FhirQuantity;
}

export interface FhirSubstitution {
  allowedBoolean: boolean;
}

export interface FhirQualification {
  code: FhirCodeableConcept;
  text?: string;
}

export interface FhirContactPoint {
  system: string;
  value: string;
}

export interface CodeSystemConcept {
  code: string;
  display: string;
  definition?: string;
  concept?: CodeSystemConcept[]; // Support for nested concepts
}

export interface CodeSystem {
  resourceType: string;
  id: string;
  url: string;
  version: string;
  name: string;
  title: string;
  status: string;
  concept: CodeSystemConcept[];
}

// FHIR Questionnaire types
export interface QuestionnaireItem {
  type: string;
  linkId: string;
  code?: Array<{
    system: string;
    code: string;
  }>;
  text: string;
  required?: boolean;
  repeats?: boolean;
  item?: QuestionnaireItem[];
  initial?: Array<{
    valueString?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
  }>;
}

export interface Questionnaire {
  resourceType: string;
  title: string;
  status: string;
  code?: Array<{
    system: string;
    code: string;
    display: string;
  }>;
  item: QuestionnaireItem[];
}

export interface FHIRParameters {
  resourceType: string;
  parameter: Array<{
    name: string;
    resource?: any;
    valueString?: string;
  }>;
}

export interface QuestionnaireResponse {
  resourceType: string;
  questionnaire: string;
  status: string;
  item: Array<{
    linkId: string;
    answer: Array<{
      valueString?: string;
      valueInteger?: number;
      valueBoolean?: boolean;
      valueDate?: string;
      valueQuantity?: {
        value: number;
        unit: string;
      };
    }>;
    item?: Array<{
      linkId: string;
      answer: Array<{
        valueString?: string;
        valueInteger?: number;
        valueBoolean?: boolean;
        valueDate?: string;
        valueQuantity?: {
          value: number;
          unit: string;
        };
      }>;
    }>;
  }>;
}

// Request tracking types
export interface ActiveRequest {
  id: string;
  kind: string;
  type: string;
  status: string;
  requestDate: string;
  lastUpdated: string;
}

export interface RequestDetails extends ActiveRequest {
  questionnaireResponse: QuestionnaireResponse;
}

// Flow service types
export interface FlowTask {
  resourceType: 'Task';
  id: string;
  status: string;
  businessStatus: {
    text: string;
  };
  intent: string;
  priority: string;
  description: string;
  authoredOn: string;
  lastModified: string;
  requester: {
    reference: string;
  };
  owner: {
    reference: string;
  };
  for: {
    reference: string;
  };
  input: Array<{
    type: {
      text: string;
    };
    valueReference: {
      reference: string;
    };
  }>;
}

export interface FlowQuestionnaire {
  resourceType: 'Questionnaire';
  id: string;
  status: string;
  date: string;
  title: string;
  description?: string;
  items: QuestionnaireItem[];
  created?: string;
}
