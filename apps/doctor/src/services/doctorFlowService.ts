import { DoctorInfoService } from './doctorInfoService';

// Doctor service interface types
export interface DoctorFlowTask {
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

export interface DoctorFlowQuestionnaire {
  resourceType: 'Questionnaire';
  id: string;
  status: string;
  date: string;
  title: string;
  description?: string;
  item: Array<{
    linkId: string;
    text: string;
    type: string;
    required?: boolean;
    initial?: Array<{
      valueString?: string;
    }>;
  }>;
  created?: string;
}

export interface DoctorFlowQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  id: string;
  status: string;
  authored: string;
  questionnaire: string;
  item: Array<{
    linkId: string;
    text: string;
    answer?: Array<{
      valueString?: string;
      valueInteger?: number;
      valueDate?: string;
    }>;
  }>;
}

export interface DoctorRequest {
  id: string;
  type: string;
  patientName: string;
  pharmacyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'completed';
  requestDate: string;
  details: string;
  taskId?: string;
}

const API_BASE_URL = 'http://localhost:3001';

export class DoctorFlowService {
  // Get a specific task by ID
  static async getTask(taskId: string): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/Task/${taskId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get a questionnaire by ID
  static async getQuestionnaire(questionnaireId: string): Promise<DoctorFlowQuestionnaire> {
    const response = await fetch(`${API_BASE_URL}/Questionnaire/${questionnaireId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get questionnaire: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get a questionnaire response by ID
  static async getQuestionnaireResponse(questionnaireResponseId: string): Promise<DoctorFlowQuestionnaireResponse> {
    const response = await fetch(`${API_BASE_URL}/QuestionnaireResponse/${questionnaireResponseId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get questionnaire response: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Accept a task
  static async acceptTask(taskId: string): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/Task/${taskId}/$accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to accept task: ${response.statusText}`);
    }

    const result = await response.json();
    return result.task;
  }

  // Reject a task
  static async rejectTask(taskId: string): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/${taskId}/\\$reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to reject task: ${response.statusText}`);
    }

    const result = await response.json();
    return result.task;
  }

  // Submit counter offer
  static async submitCounterOffer(taskId: string, questionnaire: DoctorFlowQuestionnaire): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/${taskId}/\\$counter-offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      },
      body: JSON.stringify({
        questionnaire: questionnaire
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit counter offer: ${response.statusText}`);
    }

    const result = await response.json();
    return result.task;
  }

  // Close a task with prescription data
  static async closeTask(taskId: string, prescriptionData: { prescriptionId: string; secret: string }): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/Task/${taskId}/$close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      },
      body: JSON.stringify({
        docId: prescriptionData.prescriptionId,
        docPw: prescriptionData.secret
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to close task: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.task;
  }

    // Get all requests for this doctor
  static async getAllRequests(): Promise<DoctorRequest[]> {
    try {
      const doctorTelematikId = DoctorInfoService.getDoctorTelematikId();
      const response = await fetch(`${API_BASE_URL}/Task?user=${doctorTelematikId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-actor-id': 'doctor-app'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get requests: ${response.statusText}`);
      }
      
      const bundle = await response.json();
      const requests: DoctorRequest[] = [];
      
      // Process each task in the bundle
      for (const entry of bundle.entry || []) {
        const task = entry.resource;
        if (!task) continue;
        
        let questionnaire = null;
        const questionnaireRef = task.input?.[0]?.valueReference?.reference;
        
        if (questionnaireRef) {
          const questionnaireId = questionnaireRef.split('/')[1];
          try {
            questionnaire = await this.getQuestionnaire(questionnaireId);
          } catch (error) {
            console.warn(`Failed to load questionnaire ${questionnaireId}:`, error);
          }
        }
        
        // Extract pharmacy name from requester reference
        const pharmacyRef = task.requester?.reference || '';
        const pharmacyId = pharmacyRef.split('/')[1] || 'Unknown';
        
        requests.push({
          id: task.id,
          type: questionnaire?.title || task.description || 'Flow Request',
          patientName: this.extractPatientName(questionnaire),
          pharmacyName: this.getPharmacyName(pharmacyId),
          status: this.mapTaskStatusToRequestStatus(task.status),
          requestDate: task.authoredOn || new Date().toISOString(),
          details: questionnaire?.description || task.description || 'No details available',
          taskId: task.id
        });
      }
      
      return requests;
    } catch (error) {
      console.error('Failed to load requests:', error);
      return [];
    }
  }

  // Extract patient name from questionnaire
  private static extractPatientName(questionnaire: DoctorFlowQuestionnaire | null): string {
    if (!questionnaire?.item) {
      return 'Unbekannt';
    }
    
    const patientItem = questionnaire.item.find(item =>
      item.linkId.includes('patient') || item.linkId.includes('name')
    );
    
    return patientItem?.initial?.[0]?.valueString || 'Unbekannt';
  }  // Get pharmacy name from ID
  private static getPharmacyName(pharmacyId: string): string {
    // In a real system, this would look up the pharmacy details
    const pharmacyNames: { [key: string]: string } = {
      'pharmacy-app': 'TI-Flow Pharmacy',
      'pharmacy-1': 'Stadtapotheke',
      'pharmacy-2': 'Zentral-Apotheke'
    };
    
    return pharmacyNames[pharmacyId] || `Pharmacy ${pharmacyId}`;
  }

  // Map task status to request status
  private static mapTaskStatusToRequestStatus(taskStatus: string): 'pending' | 'approved' | 'rejected' | 'in-progress' | 'completed' {
    switch (taskStatus) {
      case 'requested':
      case 'received':
        return 'pending';
      case 'accepted':
        return 'approved';
      case 'completed':
        return 'completed';
      case 'rejected':
        return 'rejected';
      case 'in_progress(Anfragender)':
      case 'in_progress(Bearbeiter)':
        return 'in-progress';
      default:
        return 'pending';
    }
  }

  // Mock prescription creation service
  static async createEPrescription(formData: any): Promise<{ prescriptionId: string; secret: string }> {
    // Mock API call to e-prescription service
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    // Generate mock prescription ID and secret (UUIDs)
    const prescriptionId = `RX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const secret = crypto.randomUUID();
    
    return {
      prescriptionId,
      secret
    };
  }
}
