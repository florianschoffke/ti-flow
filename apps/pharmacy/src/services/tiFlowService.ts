import type { CodeSystem, Prescription, FHIRParameters, QuestionnaireResponse, ActiveRequest, RequestDetails } from '../types';

const API_BASE_URL = 'http://localhost:3001';

export class TiFlowService {
  static async getCodeSystem(): Promise<CodeSystem> {
    const response = await fetch(`${API_BASE_URL}/$flow-operations`);
    if (!response.ok) {
      throw new Error('Failed to fetch CodeSystem');
    }
    return response.json();
  }

  static async getRequestOperations(): Promise<CodeSystem> {
    const response = await fetch(`${API_BASE_URL}/$request-operations`);
    if (!response.ok) {
      throw new Error('Failed to fetch Request Operations CodeSystem');
    }
    return response.json();
  }

  static async populatePrescription(prescription: Prescription, operationCode: string): Promise<FHIRParameters> {
    const response = await fetch(`${API_BASE_URL}/$populate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prescription,
        operationCode,
        timestamp: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to populate prescription');
    }
    
    return response.json();
  }

  static async populateRequest(requestCode: string, pharmacyData?: any): Promise<FHIRParameters> {
    const response = await fetch(`${API_BASE_URL}/$populate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestCode,
        pharmacyData: pharmacyData || {
          pharmacyName: 'Apotheke Musterapotheke',
          pharmacyTID: '3-SMC-B-Testkarte-883110000116873'
        },
        timestamp: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to populate request');
    }
    
    return response.json();
  }

  static async submitFlowRequest(questionnaireResponse: QuestionnaireResponse): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/$flow-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(questionnaireResponse),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit flow request');
    }
    
    return response.json();
  }

  static async getActiveRequests(): Promise<{ total: number; requests: ActiveRequest[] }> {
    const response = await fetch(`${API_BASE_URL}/$active-requests`);
    if (!response.ok) {
      throw new Error('Failed to fetch active requests');
    }
    return response.json();
  }

  static async getRequestDetails(requestId: string): Promise<RequestDetails> {
    const response = await fetch(`${API_BASE_URL}/$active-requests/${requestId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch request details');
    }
    return response.json();
  }
}
