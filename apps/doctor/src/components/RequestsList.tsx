import React, { useState, useEffect } from 'react';
import type { DoctorRequest, DoctorFlowQuestionnaire, DoctorFlowQuestionnaireResponse } from '../services/doctorFlowService';
import { DoctorFlowService } from '../services/doctorFlowService';
import { PrescriptionForm } from './PrescriptionForm';

interface RequestsListProps {
  onPrescriptionCreated?: () => void;
}

// Helper function to render QuestionnaireResponse items recursively
const renderResponseItem = (item: any, index: number): React.JSX.Element => {
  const getValue = (item: any) => {
    if (!item.answer || item.answer.length === 0) {
      return 'Nicht angegeben';
    }
    
    const answer = item.answer[0];
    return answer.valueString || answer.valueInteger || answer.valueDate || 'Nicht angegeben';
  };

  // Handle group items
  if (item.item && item.item.length > 0) {
    return (
      <div key={index} className="questionnaire-group">
        <h6 className="group-title">{item.text}</h6>
        <div className="group-items">
          {item.item.map((subItem: any, subIndex: number) => 
            renderResponseItem(subItem, subIndex)
          )}
        </div>
      </div>
    );
  }

  // Handle regular items
  return (
    <div key={index} className="questionnaire-item">
      <label>{item.text}:</label>
      <div className="item-value">
        {getValue(item)}
      </div>
    </div>
  );
};

export function RequestsList({ onPrescriptionCreated }: RequestsListProps) {
  const [requests, setRequests] = useState<DoctorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DoctorRequest | null>(null);
  const [questionnaireResponse, setQuestionnaireResponse] = useState<DoctorFlowQuestionnaireResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionPrefill, setPrescriptionPrefill] = useState<any>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const requestList = await DoctorFlowService.getAllRequests();
      setRequests(requestList);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewRequestDetails = async (request: DoctorRequest) => {
    if (!request.taskId) return;
    
    setSelectedRequest(request);
    setShowDetails(true);
    
    try {
      const task = await DoctorFlowService.getTask(request.taskId);
      
      // Get the QuestionnaireResponse reference from the task input
      const questionnaireResponseRef = task.input[0]?.valueReference?.reference;
      
      if (questionnaireResponseRef) {
        const questionnaireResponseId = questionnaireResponseRef.split('/')[1];
        const qr = await DoctorFlowService.getQuestionnaireResponse(questionnaireResponseId);
        setQuestionnaireResponse(qr);
      }
    } catch (error) {
      console.error('Failed to load request details:', error);
    }
  };

  const handleAccept = async (request: DoctorRequest) => {
    if (!request.taskId) return;
    
    setActionLoading(true);
    try {
      // First, accept the task
      await DoctorFlowService.acceptTask(request.taskId);
      
      // Then load the questionnaire response to get the medication data
      const response = await DoctorFlowService.getQuestionnaireResponse(request.taskId);
      if (response) {
        // Extract medication group data
        const medicationGroup = response.item.find(item => item.linkId === 'change_request') as any;
        
        let prefillData: any = {};
        if (medicationGroup && medicationGroup.item) {
          const medication = medicationGroup.item.find((item: any) => item.linkId === 'medication');
          const pzn = medicationGroup.item.find((item: any) => item.linkId === 'pzn');
          const dosage = medicationGroup.item.find((item: any) => item.linkId === 'dosage');
          const packages = medicationGroup.item.find((item: any) => item.linkId === 'packages');
          
          prefillData = {
            medication: medication?.answer?.[0]?.valueString || '',
            pzn: pzn?.answer?.[0]?.valueInteger || '',
            dosage: dosage?.answer?.[0]?.valueString || '',
            packages: packages?.answer?.[0]?.valueInteger || ''
          };
        }
        
        // Find patient by KVNR
        const patientKvnr = response.item.find(item => item.linkId === 'patient_kvnr')?.answer?.[0]?.valueString;
        if (patientKvnr) {
          // Map KVNR to patient ID
          const patientMap: Record<string, string> = {
            'A123456789': 'pat-001',
            'K220635158': 'pat-004',
            'B987654321': 'pat-002', 
            'C456789123': 'pat-003'
          };
          
          prefillData = {
            ...prefillData,
            patientId: patientMap[patientKvnr] || ''
          };
        }
        
        setPrescriptionPrefill({ ...prefillData, taskId: request.taskId });
        setShowPrescriptionModal(true);
        // Close the details view when opening the modal
        setShowDetails(false);
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePrescription = async (request: DoctorRequest) => {
    if (!request.taskId) return;
    
    setActionLoading(true);
    try {
      // Load the questionnaire response to get the medication data for approved tasks
      const response = await DoctorFlowService.getQuestionnaireResponse(request.taskId);
      
      let prefillData: any = {};
      if (response) {
        // Extract medication group data
        const medicationGroup = response.item.find(item => item.linkId === 'change_request') as any;
        
        if (medicationGroup && medicationGroup.item) {
          const medication = medicationGroup.item.find((item: any) => item.linkId === 'medication');
          const pzn = medicationGroup.item.find((item: any) => item.linkId === 'pzn');
          const dosage = medicationGroup.item.find((item: any) => item.linkId === 'dosage');
          const packages = medicationGroup.item.find((item: any) => item.linkId === 'packages');
          
          prefillData = {
            medication: medication?.answer?.[0]?.valueString || '',
            pzn: pzn?.answer?.[0]?.valueInteger || '',
            dosage: dosage?.answer?.[0]?.valueString || '',
            packages: packages?.answer?.[0]?.valueInteger || ''
          };
        }
        
        // Find patient by KVNR
        const patientKvnr = response.item.find(item => item.linkId === 'patient_kvnr')?.answer?.[0]?.valueString;
        if (patientKvnr) {
          // Map KVNR to patient ID
          const patientMap: Record<string, string> = {
            'A123456789': 'pat-001',
            'K220635158': 'pat-004',
            'B987654321': 'pat-002', 
            'C456789123': 'pat-003'
          };
          
          prefillData = {
            ...prefillData,
            patientId: patientMap[patientKvnr] || ''
          };
        }
      }
      
      setPrescriptionPrefill({ ...prefillData, taskId: request.taskId });
      setShowPrescriptionModal(true);
    } catch (error) {
      console.error('Failed to load prescription data:', error);
      // If we can't load data, still open the modal with default values
      setPrescriptionPrefill({ taskId: request.taskId });
      setShowPrescriptionModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (request: DoctorRequest) => {
    if (!request.taskId) return;
    
    setActionLoading(true);
    try {
      await DoctorFlowService.rejectTask(request.taskId);
      await loadRequests(); // Refresh the list
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCounterOffer = async (request: DoctorRequest) => {
    if (!request.taskId || !questionnaireResponse) return;
    
    // Create a counter-offer questionnaire based on the original response
    const counterOfferQuestionnaire: DoctorFlowQuestionnaire = {
      resourceType: 'Questionnaire',
      id: `counter-${questionnaireResponse.id}`,
      status: 'active',
      date: new Date().toISOString(),
      title: `Counter-offer for request`,
      description: 'Modified prescription details from doctor',
      item: questionnaireResponse.item.map(item => ({
        linkId: item.linkId,
        text: item.text,
        type: 'string',
        initial: item.answer && item.answer.length > 0 
          ? [{ valueString: `Modified: ${item.answer[0].valueString || item.answer[0].valueInteger || item.answer[0].valueDate}` }]
          : [{ valueString: 'Modified value' }]
      }))
    };

    setActionLoading(true);
    try {
      await DoctorFlowService.submitCounterOffer(request.taskId, counterOfferQuestionnaire);
      await loadRequests(); // Refresh the list
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to submit counter-offer:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (request: DoctorRequest) => {
    if (!request.taskId) return;
    
    // Generate mock prescription data
    const docId = `prescription-${Date.now()}`;
    const docPw = `pwd-${Math.random().toString(36).substring(7)}`;

    setActionLoading(true);
    try {
      await DoctorFlowService.closeTask(request.taskId, {
        prescriptionId: docId,
        secret: docPw
      });
      await loadRequests(); // Refresh the list
      setShowDetails(false);
      alert(`Prescription created!\nDocument ID: ${docId}\nPassword: ${docPw}`);
    } catch (error) {
      console.error('Failed to complete request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const getStatusColor = (status: DoctorRequest['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'in-progress': return '#3b82f6';
      case 'completed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: DoctorRequest['status']) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'approved': return 'Genehmigt';
      case 'rejected': return 'Abgelehnt';
      case 'in-progress': return 'In Bearbeitung';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  if (showDetails && selectedRequest) {
    return (
      <div className="card">
        <div className="requests-header">
          <h3>📋 Anfragedetails</h3>
          <button 
            onClick={() => setShowDetails(false)}
            className="back-button"
          >
            ← Zurück zur Liste
          </button>
        </div>

        <div className="request-details">
          <h4>{selectedRequest.type}</h4>
          <p><strong>Patient:</strong> {selectedRequest.patientName}</p>
          <p><strong>Apotheke:</strong> {selectedRequest.pharmacyName}</p>
          <p><strong>Status:</strong> <span style={{ color: getStatusColor(selectedRequest.status) }}>
            {getStatusText(selectedRequest.status)}
          </span></p>
          <p><strong>Datum:</strong> {new Date(selectedRequest.requestDate).toLocaleString()}</p>

          {questionnaireResponse && (
            <div className="questionnaire-section">
              <h5>Anfrage Details:</h5>
              <div className="questionnaire-items">
                {questionnaireResponse.item.map((item, index) => 
                  renderResponseItem(item, index)
                )}
              </div>
            </div>
          )}

          <div className="action-buttons">
            {selectedRequest.status === 'pending' && (
              <>
                <button 
                  onClick={() => handleAccept(selectedRequest)}
                  disabled={actionLoading}
                  className="accept-button"
                >
                  {actionLoading ? 'Wird bearbeitet...' : '✅ Annehmen'}
                </button>
                <button 
                  onClick={() => handleCounterOffer(selectedRequest)}
                  disabled={actionLoading}
                  className="counter-offer-button"
                >
                  {actionLoading ? 'Wird bearbeitet...' : '🔄 Gegenangebot'}
                </button>
                <button 
                  onClick={() => handleReject(selectedRequest)}
                  disabled={actionLoading}
                  className="reject-button"
                >
                  {actionLoading ? 'Wird bearbeitet...' : '❌ Ablehnen'}
                </button>
              </>
            )}
            
            {selectedRequest.status === 'approved' && (
              <button 
                onClick={() => handleComplete(selectedRequest)}
                disabled={actionLoading}
                className="complete-button"
              >
                {actionLoading ? 'Wird bearbeitet...' : '📝 Rezept erstellen'}
              </button>
            )}

            {selectedRequest.status === 'in-progress' && (
              <>
                <button 
                  onClick={() => handleAccept(selectedRequest)}
                  disabled={actionLoading}
                  className="accept-button"
                >
                  {actionLoading ? 'Wird bearbeitet...' : '✅ Akzeptieren'}
                </button>
                <button 
                  onClick={() => handleCounterOffer(selectedRequest)}
                  disabled={actionLoading}
                  className="counter-offer-button"
                >
                  {actionLoading ? 'Wird bearbeitet...' : '🔄 Neues Gegenangebot'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="requests-header">
        <h3>📋 Anfragen von Apotheken</h3>
        <button onClick={loadRequests} disabled={isLoading} className="refresh-button">
          {isLoading ? '⟳' : '🔄'} Aktualisieren
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Lade Anfragen...</div>
      ) : requests.length === 0 ? (
        <div className="no-requests">
          <p>📭 Keine Anfragen verfügbar</p>
          <p>Anfragen von Apotheken werden hier angezeigt, sobald sie eingehen.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <h4>{request.type}</h4>
                <span 
                  className="request-status"
                  style={{ backgroundColor: getStatusColor(request.status) }}
                >
                  {getStatusText(request.status)}
                </span>
              </div>
              
              <div className="request-info">
                <p><strong>Patient:</strong> {request.patientName}</p>
                <p><strong>Apotheke:</strong> {request.pharmacyName}</p>
                <p><strong>Datum:</strong> {new Date(request.requestDate).toLocaleString()}</p>
                <p><strong>Details:</strong> {request.details}</p>
              </div>

              <div className="request-actions">
                <button 
                  onClick={() => viewRequestDetails(request)}
                  className="view-button"
                >
                  👀 Details ansehen
                </button>
                {request.status === 'approved' && (
                  <button 
                    onClick={() => handleCreatePrescription(request)}
                    disabled={actionLoading}
                    className="accept-button"
                    style={{ marginLeft: '8px' }}
                  >
                    {actionLoading ? 'Wird bearbeitet...' : '📝 E-Rezept erstellen'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 E-Rezept erstellen</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPrescriptionModal(false)}
              >
                ×
              </button>
            </div>
            <PrescriptionForm 
              prefillData={prescriptionPrefill}
              taskId={prescriptionPrefill?.taskId}
              onPrescriptionCreated={() => {
                setShowPrescriptionModal(false);
                onPrescriptionCreated?.();
                loadRequests();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
