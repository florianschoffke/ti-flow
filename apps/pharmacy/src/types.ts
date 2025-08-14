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
  issueDate: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  compositionType: string;
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
