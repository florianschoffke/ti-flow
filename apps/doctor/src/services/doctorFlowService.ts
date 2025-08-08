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
  items: Array<{
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

export interface DoctorRequest {
  id: string;
  type: string;
  patientName: string;
  pharmacyName: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-progress';
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

  // Accept a task
  static async acceptTask(taskId: string): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/${taskId}/\\$accept`, {
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

  // Close a task
  static async closeTask(taskId: string): Promise<DoctorFlowTask> {
    const response = await fetch(`${API_BASE_URL}/${taskId}/\\$close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-id': 'doctor-app'
      }
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
      const requests: DoctorRequest[] = [];
      
      // Try to get some recent tasks (scan approach)
      for (let i = 1; i <= 10; i++) {
        try {
          const task = await this.getTask(i.toString());
          
          // Check if this task is for the doctor
          if (task && task.for?.reference === 'Organization/doctor-app') {
            const questionnaireRef = task.input[0]?.valueReference?.reference;
            let questionnaire = null;
            
            if (questionnaireRef) {
              const questionnaireId = questionnaireRef.split('/')[1];
              try {
                questionnaire = await this.getQuestionnaire(questionnaireId);
              } catch (error) {
                // Questionnaire might not exist
              }
            }
            
            // Extract pharmacy name from requester reference
            const pharmacyRef = task.requester.reference;
            const pharmacyId = pharmacyRef.split('/')[1];
            
            requests.push({
              id: task.id,
              type: questionnaire?.title || task.description || 'Flow Request',
              patientName: this.extractPatientName(questionnaire),
              pharmacyName: this.getPharmacyName(pharmacyId),
              status: this.mapTaskStatusToRequestStatus(task.businessStatus.text),
              requestDate: task.authoredOn,
              details: questionnaire?.description || 'Flow request',
              taskId: task.id
            });
          }
        } catch (error) {
          // Task doesn't exist, continue until we hit non-existent tasks
          break;
        }
      }
      
      return requests;
    } catch (error) {
      console.error('Failed to get all requests:', error);
      return [];
    }
  }

  // Extract patient name from questionnaire
  private static extractPatientName(questionnaire: DoctorFlowQuestionnaire | null): string {
    if (!questionnaire?.items) {
      return 'Unknown Patient';
    }
    
    const patientItem = questionnaire.items.find(item => 
      item.linkId.includes('patient') || item.text.toLowerCase().includes('patient')
    );
    
    return patientItem?.initial?.[0]?.valueString || 'Unknown Patient';
  }

  // Get pharmacy name from ID
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
  private static mapTaskStatusToRequestStatus(taskStatus: string): 'pending' | 'approved' | 'rejected' | 'in-progress' {
    switch (taskStatus) {
      case 'requested':
      case 'received':
        return 'pending';
      case 'accepted':
      case 'completed':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'in_progress(Anfragender)':
      case 'in_progress(Bearbeiter)':
        return 'in-progress';
      default:
        return 'pending';
    }
  }

  // Create prescription (placeholder for future implementation)
  static async createPrescription(patientData: any, medicationData: any): Promise<{ success: boolean; prescriptionId?: string }> {
    // This would integrate with the prescription system
    // For now, return a mock response
    return {
      success: true,
      prescriptionId: `RX-${Date.now()}`
    };
  }
}
