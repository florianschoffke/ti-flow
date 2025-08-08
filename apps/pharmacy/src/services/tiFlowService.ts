import type {
  CodeSystemConcept,
  Questionnaire,
  ActiveRequest,
  RequestDetails
} from '../types';

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

  // Submit a flow request (creates a Task)
  static async submitFlowRequest(operationCode: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/$request`, {
      method: 'POST',
      body: JSON.stringify({
        requester: 'pharmacy-app',
        receiver: 'doctor-app',
        questionnaire: operationCode
      })
    });
  }

  // Create a new flow request
  static async createFlowRequest(operationCode: string): Promise<any> {
    return this.submitFlowRequest(operationCode);
  }

  // Get a specific task
  static async getTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/${taskId}`);
  }

  // Accept a task
  static async acceptTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/${taskId}/$accept`, {
      method: 'POST'
    });
  }

  // Reject a task
  static async rejectTask(taskId: string): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/${taskId}/$reject`, {
      method: 'POST'
    });
  }

  // Submit counter offer
  static async submitCounterOffer(taskId: string, questionnaire: Questionnaire): Promise<any> {
    return this.fetchWithAuth(`${BASE_URL}/Task/${taskId}/$counter-offer`, {
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
    return this.fetchWithAuth(`${BASE_URL}/Task/${taskId}/$close`, {
      method: 'POST'
    });
  }

  // Get active requests (from pharmacy perspective)
  static async getActiveRequests(): Promise<{ requests: ActiveRequest[] }> {
    try {
      // For now, let's get tasks by requesting them individually since there's no bulk endpoint
      // In a real implementation, you might have a search/filter endpoint
      const activeRequests: ActiveRequest[] = [];
      
      // Try to get some recent tasks (this is a simplified approach)
      for (let i = 1; i <= 10; i++) {
        try {
          const task = await this.getTask(i.toString());
          if (task && task.requester?.reference === 'Organization/pharmacy-app') {
            activeRequests.push({
              id: task.id,
              type: 'Request Operation', // We could map this from the questionnaire
              kind: 'flow-request',
              status: task.status,
              requestDate: task.authoredOn || new Date().toISOString(),
              lastUpdated: task.lastModified || task.authoredOn || new Date().toISOString()
            });
          }
        } catch (error) {
          // Task doesn't exist, continue
          break;
        }
      }

      return { requests: activeRequests };
    } catch (error) {
      console.error('Failed to get active requests:', error);
      return { requests: [] };
    }
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
