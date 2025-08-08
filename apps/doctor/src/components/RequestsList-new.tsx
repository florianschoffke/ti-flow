import { useState, useEffect } from 'react';
import type { DoctorRequest, DoctorFlowQuestionnaire } from '../services/doctorFlowService';
import { DoctorFlowService } from '../services/doctorFlowService';

export function RequestsList() {
  const [requests, setRequests] = useState<DoctorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DoctorRequest | null>(null);
  const [questionnaire, setQuestionnaire] = useState<DoctorFlowQuestionnaire | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
      const questionnaireRef = task.input[0]?.valueReference?.reference;
      
      if (questionnaireRef) {
        const questionnaireId = questionnaireRef.split('/')[1];
        const q = await DoctorFlowService.getQuestionnaire(questionnaireId);
        setQuestionnaire(q);
      }
    } catch (error) {
      console.error('Failed to load request details:', error);
    }
  };

  const handleAccept = async (request: DoctorRequest) => {
    if (!request.taskId) return;
    
    setActionLoading(true);
    try {
      await DoctorFlowService.acceptTask(request.taskId);
      await loadRequests(); // Refresh the list
    } catch (error) {
      console.error('Failed to accept request:', error);
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
    if (!request.taskId || !questionnaire) return;
    
    // Create a counter-offer questionnaire with modified data
    const counterOfferQuestionnaire = {
      title: `Counter-offer: ${questionnaire.title}`,
      description: 'Modified prescription details from doctor',
      items: questionnaire.items.map(item => ({
        ...item,
        initial: [{ valueString: `Modified ${item.text}` }]
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
    
    // Generate prescription document
    const docId = `prescription-${Date.now()}`;
    const docPw = `pwd-${Math.random().toString(36).substring(7)}`;

    setActionLoading(true);
    try {
      await DoctorFlowService.closeTask(request.taskId, docId, docPw);
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
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: DoctorRequest['status']) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'approved': return 'Genehmigt';
      case 'rejected': return 'Abgelehnt';
      case 'in-progress': return 'In Bearbeitung';
      default: return status;
    }
  };

  if (showDetails && selectedRequest) {
    return (
      <div className="requests-section">
        <div className="requests-header">
          <h2>📋 Anfragedetails</h2>
          <button 
            onClick={() => setShowDetails(false)}
            className="back-button"
          >
            ← Zurück zur Liste
          </button>
        </div>

        <div className="request-details">
          <h3>{selectedRequest.type}</h3>
          <p><strong>Patient:</strong> {selectedRequest.patientName}</p>
          <p><strong>Apotheke:</strong> {selectedRequest.pharmacyName}</p>
          <p><strong>Status:</strong> <span style={{ color: getStatusColor(selectedRequest.status) }}>
            {getStatusText(selectedRequest.status)}
          </span></p>
          <p><strong>Datum:</strong> {new Date(selectedRequest.requestDate).toLocaleString()}</p>

          {questionnaire && (
            <div className="questionnaire-section">
              <h4>Anfrage Details:</h4>
              <div className="questionnaire-items">
                {questionnaire.items.map((item, index) => (
                  <div key={index} className="questionnaire-item">
                    <label>{item.text}:</label>
                    <div className="item-value">
                      {item.initial && item.initial.length > 0 
                        ? item.initial[0].valueString 
                        : 'Nicht angegeben'
                      }
                    </div>
                  </div>
                ))}
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
    <div className="requests-section">
      <div className="requests-header">
        <h2>📋 Anfragen von Apotheken</h2>
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
                <h3>{request.type}</h3>
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
                
                {request.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleAccept(request)}
                      disabled={actionLoading}
                      className="quick-accept-button"
                    >
                      ✅ Annehmen
                    </button>
                    <button 
                      onClick={() => handleReject(request)}
                      disabled={actionLoading}
                      className="quick-reject-button"
                    >
                      ❌ Ablehnen
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
