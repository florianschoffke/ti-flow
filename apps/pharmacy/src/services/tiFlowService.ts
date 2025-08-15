import type {
  CodeSystemConcept,
  Questionnaire,
  QuestionnaireResponse,
  ActiveRequest,
  RequestDetails,
  FhirBundle
} from '../types';
import { FhirXmlToJsonConverter } from '../utils/fhirXmlToJsonConverter';

const BASE_URL = 'http://localhost:3001';

export class TiFlowService {
  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'pharmacy-app',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Get available request operations
  static async getRequestOperations(): Promise<{ concepts: CodeSystemConcept[] }> {
    const response = await this.fetchWithAuth(`${BASE_URL}/$request-operations`);
    return {
      concepts: response.concept || []
    };
  }

  // Get available document operations  
  static async getDocumentOperations(): Promise<{ concepts: CodeSystemConcept[] }> {
    const response = await this.fetchWithAuth(`${BASE_URL}/$document-operations`);
    return {
      concepts: response.concept || []
    };
  }

  // Get a specific questionnaire for a request operation code
  static async getRequestOperationQuestionnaire(code: string): Promise<Questionnaire> {
    const response = await this.fetchWithAuth(`${BASE_URL}/$request-operations?code=${code}`);
    return response;
  }

  // Get all tasks for the current user
  static async getTasksForUser(user: string = 'pharmacy-app'): Promise<any[]> {
    const response = await this.fetchWithAuth(`${BASE_URL}/Task?user=${user}`);
    return response.entry?.map((entry: any) => entry.resource) || [];
  }

  // Get a questionnaire by ID
  static async getQuestionnaireById(id: string): Promise<Questionnaire> {
    const response = await this.fetchWithAuth(`${BASE_URL}/Questionnaire/${id}`);
    return response;
  }

  // Get a questionnaire response by ID
  static async getQuestionnaireResponseById(id: string): Promise<QuestionnaireResponse> {
    const response = await this.fetchWithAuth(`${BASE_URL}/QuestionnaireResponse/${id}`);
    return response;
  }

  // Populate questionnaire using SDC $populate operation
  static async populateQuestionnaire(questionnaireId: string, fhirBundle: any): Promise<QuestionnaireResponse> {
    try {
      console.log('🔄 populateQuestionnaire called with:');
      console.log('📋 questionnaireId:', questionnaireId);
      console.log('📦 fhirBundle:', fhirBundle);
      
      // Convert our minimal FhirBundle to proper FHIR Bundle JSON format
      let properFhirBundle = fhirBundle;
      
      // Always try to convert XML file to get complete FHIR data
      if (fhirBundle) {
        try {
          // Map prescription IDs to XML files - for now use a simple approach
          const xmlFilePaths = [
            '/data/prescriptions/Beispiel_1_PZN.xml',
            '/data/prescriptions/Beispiel_3_PKV.xml', 
            '/data/prescriptions/Beispiel_22_Freitextverordnung.xml'
          ];
          
          // Use the first file for now - in real implementation you'd match by prescription ID
          const xmlFilePath = xmlFilePaths[0];
          
          console.log(`🔄 Converting XML file to proper FHIR JSON: ${xmlFilePath}`);
          console.log('📦 Original bundle before conversion:', fhirBundle);
          properFhirBundle = await FhirXmlToJsonConverter.convertXmlToJson(xmlFilePath);
          console.log('✅ Successfully converted XML to FHIR JSON');
          console.log('📋 Converted bundle entries count:', properFhirBundle?.entry?.length || 0);
          console.log('📋 Converted bundle structure:', {
            resourceType: properFhirBundle?.resourceType,
            id: properFhirBundle?.id,
            type: properFhirBundle?.type,
            entryTypes: properFhirBundle?.entry?.map((e: any) => e.resource?.resourceType) || []
          });
          
          // Check specifically for Medication resource
          const medEntry = properFhirBundle?.entry?.find((e: any) => e.resource?.resourceType === 'Medication');
          if (medEntry) {
            console.log('💊 Found Medication resource in converted bundle:', medEntry.resource);
          } else {
            console.log('❌ No Medication resource found in converted bundle');
          }
          
        } catch (error) {
          console.warn('⚠️ Failed to convert XML to JSON, using original bundle:', error);
          // Fall back to original bundle if conversion fails
        }
      } else {
        console.log('ℹ️ No fhirBundle provided');
      }

      // Create FHIR Parameters for the populate request
      const parameters = {
        resourceType: "Parameters",
        parameter: [
          {
            name: "context",
            part: [
              {
                name: "name",
                valueString: "e16A"
              },
              {
                name: "content",
                resource: properFhirBundle
              }
            ]
          }
        ]
      };

      console.log(`🔄 Populating questionnaire ${questionnaireId} with full FHIR bundle`);
      console.log('📋 Request parameters:', JSON.stringify(parameters, null, 2));

      const response = await fetch(`${BASE_URL}/Questionnaire/${questionnaireId}/$populate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Populate request failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to populate questionnaire: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Populate response:', result);

      // Extract QuestionnaireResponse from Parameters response
      if (result.resourceType === 'Parameters' && result.parameter) {
        const responseParam = result.parameter.find((p: any) => p.name === 'response');
        if (responseParam && responseParam.resource) {
          return responseParam.resource as QuestionnaireResponse;
        }
      }

      throw new Error('Invalid populate response format');
    } catch (error) {
      console.error('❌ Error populating questionnaire:', error);
      throw error;
    }
  }

  /*
   * Convert our custom FhirBundle to proper FHIR Bundle format
   * TODO: Implement proper XML to JSON conversion
   */
  private static async convertToProperFhirBundle(fhirBundle: any): Promise<any> {
    // If it's already a proper FHIR Bundle, return as is
    if (fhirBundle.resourceType === 'Bundle') {
      return fhirBundle;
    }

    // If we have a prescription ID, try to load the actual XML file
    if (fhirBundle.prescriptionId) {
      try {
        // Try to find and convert the corresponding XML file
        const xmlFiles = [
          '/data/prescriptions/Beispiel_1_PZN.xml',
          '/data/prescriptions/Beispiel_3_PKV.xml',
          '/data/prescriptions/Beispiel_22_Freitextverordnung.xml'
        ];

        // For now, use the first file as an example
        // In a real implementation, you'd match based on prescription ID
        const xmlFilePath = xmlFiles[0];
        
        console.log(`🔄 Converting XML file to FHIR JSON: ${xmlFilePath}`);
        const properBundle = await FhirXmlToJsonConverter.convertXmlToJson(xmlFilePath);
        
        console.log('✅ Successfully converted XML to FHIR JSON:', properBundle);
        return properBundle;
        
      } catch (error) {
        console.warn('⚠️ Failed to convert XML to JSON, using fallback:', error);
      }
    }

    // Fallback: Create a basic FHIR Bundle structure with mock data
    console.log('📋 Using fallback FHIR Bundle structure');
    return {
      resourceType: "Bundle",
      id: fhirBundle.id || "test-bundle",
      identifier: {
        system: "https://gematik.de/fhir/erp/NamingSystem/GEM_ERP_NS_PrescriptionId",
        value: fhirBundle.prescriptionId || "160.100.000.000.023.70"
      },
      type: "document",
      timestamp: fhirBundle.timestamp || new Date().toISOString(),
      entry: [
        {
          fullUrl: "http://example.org/Patient/1",
          resource: {
            resourceType: "Patient",
            id: "1",
            identifier: [
              {
                type: {
                  coding: [
                    {
                      system: "http://fhir.de/CodeSystem/identifier-type-de-basis",
                      code: "KVZ10"
                    }
                  ]
                },
                system: "http://fhir.de/sid/gkv/kvid-10",
                value: "X234567890"
              }
            ],
            name: [
              {
                use: "official",
                family: "Müller",
                given: ["Max"]
              }
            ],
            birthDate: "1975-05-15"
          }
        },
        {
          fullUrl: "http://example.org/Medication/1",
          resource: {
            resourceType: "Medication",
            id: "1",
            code: {
              text: "Aspirin 500mg Tabletten"
            }
          }
        },
        {
          fullUrl: "http://example.org/MedicationRequest/1",
          resource: {
            resourceType: "MedicationRequest",
            id: "1",
            status: "active",
            intent: "order",
            medicationReference: {
              reference: "Medication/1"
            },
            subject: {
              reference: "Patient/1"
            },
            requester: {
              reference: "Practitioner/1"
            },
            authoredOn: "2025-08-14"
          }
        },
        {
          fullUrl: "http://example.org/Practitioner/1",
          resource: {
            resourceType: "Practitioner",
            id: "1",
            identifier: [
              {
                type: {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                      code: "LANR"
                    }
                  ]
                },
                system: "https://gematik.de/fhir/sid/telematik-id",
                value: "123456789"
              }
            ],
            name: [
              {
                use: "official",
                prefix: ["Dr."],
                family: "Schmidt",
                given: ["Hans"]
              }
            ]
          }
        },
        {
          fullUrl: "http://example.org/Organization/1",
          resource: {
            resourceType: "Organization",
            id: "1",
            name: "Praxis Dr. Schmidt"
          }
        }
      ]
    };
  }

  // Submit a flow request (creates a Task)
  static async submitFlowRequest(questionnaireResponse: QuestionnaireResponse): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/$start-document-request`, {
      method: 'POST',
      body: JSON.stringify(questionnaireResponse)
    });
  }

  // Create a new flow request
  static async createFlowRequest(questionnaireResponse: QuestionnaireResponse): Promise<any> {
    return this.submitFlowRequest(questionnaireResponse);
  }

  // Get a specific task
  static async getTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/${taskId}`);
  }

    // Accept a task
  static async acceptTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/${taskId}/$accept`, {
      method: 'POST'
    });
  }

  // Reject a task
  static async rejectTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/${taskId}/$reject`, {
      method: 'POST'
    });
  }

  // Submit counter offer
  static async submitCounterOffer(taskId: string, questionnaire: Questionnaire): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/${taskId}/$counter-offer`, {
      method: 'POST',
      body: JSON.stringify({
        resourceType: 'Parameters',
        parameter: [
          {
            name: 'questionnaire',
            resource: questionnaire
          }
        ]
      })
    });
  }

  // Close a task
  static async closeTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/${taskId}/$close`, {
      method: 'POST'
    });
  }

  // Get active requests (from pharmacy perspective)
  static async getActiveRequests(): Promise<{ requests: ActiveRequest[] }> {
    try {
      // Get pharmacy telematik-ID from pharmacy info
      const pharmacyInfoResponse = await fetch('/data/pharmacyInfo.json');
      const pharmacyInfo = await pharmacyInfoResponse.json();
      const pharmacyTelematikId = pharmacyInfo.pharmacyInfo.telematikId;
      
      console.log(`🔍 Fetching tasks for pharmacy: ${pharmacyTelematikId}`);
      const response = await this.fetchWithAuth(`${BASE_URL}/Task?user=${pharmacyTelematikId}`);
      
      const activeRequests: ActiveRequest[] = [];
      
      if (response.entry && Array.isArray(response.entry)) {
        for (const entry of response.entry) {
          const task = entry.resource;
          if (task && task.resourceType === 'Task') {
            // Only include tasks where pharmacy is the receiver (assigned to pharmacy)
            const receiverMatch = task.owner?.reference === `Organization/${pharmacyTelematikId}` ||
                                 task.for?.reference === `Organization/${pharmacyTelematikId}`;
            
            if (receiverMatch && task.status !== 'completed' && task.status !== 'cancelled') {
              activeRequests.push({
                id: task.id,
                type: this.getTaskTypeFromCode(task.code) || 'Dokumentenanfrage',
                kind: 'document-request',
                status: task.status,
                requestDate: task.authoredOn || new Date().toISOString(),
                lastUpdated: task.lastModified || task.authoredOn || new Date().toISOString(),
                requesterName: this.getRequesterName(task.requester?.reference) || 'Unbekannt',
                description: task.description || 'Dokumentenanfrage'
              });
            }
          }
        }
      }
      
      console.log(`✅ Found ${activeRequests.length} active requests for pharmacy`);
      return { requests: activeRequests };
    } catch (error) {
      console.error('❌ Error fetching active requests:', error);
      return { requests: [] };
    }
  }

  // Helper method to get task type from task code
  private static getTaskTypeFromCode(code: any): string | null {
    if (!code?.coding) return null;
    const coding = Array.isArray(code.coding) ? code.coding[0] : code.coding;
    return coding?.display || coding?.code || null;
  }

  // Helper method to extract requester name from reference
  private static getRequesterName(requesterReference: string | undefined): string | null {
    if (!requesterReference) return null;
    
    // Extract telematik-ID from Organization reference
    const match = requesterReference.match(/Organization\/(.+)/);
    if (match) {
      const telematikId = match[1];
      // Could be enhanced to lookup actual name from contacts or other service
      return `Anfragender (${telematikId})`;
    }
    
    return null;
  }

  // Helper method to determine task kind from questionnaire canonical
  private static getTaskKind(questionnaireCanonical: string | undefined): string | null {
    if (!questionnaireCanonical) return null;
    
    if (questionnaireCanonical.includes('flow-request')) return 'flow-request';
    if (questionnaireCanonical.includes('document-request')) return 'document-request';
    
    return 'flow-request'; // default;
  }

  // Get request details with questionnaire response
  static async getRequestDetails(requestId: string): Promise<RequestDetails | null> {
    try {
      const task = await this.getTask(requestId);
      
      // Extract questionnaire reference from task input
      const questionnaireInput = task.input?.find((input: any) => 
        input.type?.text === 'questionnaire'
      );

      if (!questionnaireInput?.valueReference?.reference) {
        throw new Error('No questionnaire found in task');
      }

      // Get questionnaire ID from reference
      const questionnaireRef = questionnaireInput.valueReference.reference;
      const questionnaireId = questionnaireRef.split('/')[1];
      
      // Fetch the questionnaire
      const questionnaire = await this.fetchWithAuth(`${BASE_URL}/Questionnaire/${questionnaireId}`);

      return {
        id: task.id,
        type: questionnaire.title || 'Unknown Request',
        kind: 'flow-request',
        status: task.status,
        requestDate: task.authoredOn || new Date().toISOString(),
        lastUpdated: task.lastModified || task.authoredOn || new Date().toISOString(),
        questionnaireResponse: {
          resourceType: 'QuestionnaireResponse',
          questionnaire: questionnaireId,
          status: 'completed',
          item: questionnaire.item.map((item: any) => ({
            linkId: item.linkId,
            text: item.text,
            answer: item.initial || [{ valueString: 'Nicht angegeben' }]
          }))
        }
      };
    } catch (error) {
      console.error('Failed to get request details:', error);
      return null;
    }
  }
}

// Export as both named and default export for compatibility
export const tiFlowService = TiFlowService;
export default TiFlowService;
