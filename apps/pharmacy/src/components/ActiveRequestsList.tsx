import { useState, useEffect } from 'react';
import type { ActiveRequest, RequestDetails } from '../types';
import { TiFlowService } from '../services/tiFlowService';
import { QuestionnaireRenderer } from './QuestionnaireRenderer';

interface ActiveRequestsListProps {
  onRequestSubmitted?: () => void;
}

export function ActiveRequestsList({ onRequestSubmitted }: ActiveRequestsListProps) {
  const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<RequestDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadActiveRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await TiFlowService.getActiveRequests();
      setActiveRequests(response.requests);
    } catch (err) {
      console.error('Failed to load active requests:', err);
      setError('Fehler beim Laden der aktiven Anfragen');
    } finally {
      setIsLoading(false);
    }
  };

  const viewRequest = async (requestId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const requestDetails = await TiFlowService.getRequestDetails(requestId);
      
      if (!requestDetails) {
        throw new Error('Anfragedetails nicht gefunden');
      }
      
      if (!requestDetails.questionnaireResponse) {
        throw new Error('Fragebogen-Antworten nicht verfügbar');
      }
      
      setViewingRequest(requestDetails);
      setShowQuestionnaire(true);
    } catch (err) {
      console.error('Failed to load request details:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Anfragedetails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    setActionLoading(true);
    try {
      await TiFlowService.acceptTask(taskId);
      await loadActiveRequests(); // Refresh the list
      setShowQuestionnaire(false);
      onRequestSubmitted?.();
    } catch (err) {
      console.error('Failed to accept task:', err);
      setError('Fehler beim Akzeptieren der Anfrage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    setActionLoading(true);
    try {
      await TiFlowService.rejectTask(taskId);
      await loadActiveRequests(); // Refresh the list
      setShowQuestionnaire(false);
      onRequestSubmitted?.();
    } catch (err) {
      console.error('Failed to reject task:', err);
      setError('Fehler beim Ablehnen der Anfrage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCounterOffer = async (taskId: string) => {
    if (!viewingRequest?.questionnaireResponse) return;

    // Create a counter-offer with modified questionnaire
    const modifiedQuestionnaire = {
      resourceType: 'Questionnaire' as const,
      status: 'active' as const,
      title: `Counter-offer: ${viewingRequest.type}`,
      item: viewingRequest.questionnaireResponse.item.map(item => ({
        linkId: item.linkId,
        text: `Modified ${item.linkId}`,
        type: 'string' as const,
        required: true
      }))
    };

    setActionLoading(true);
    try {
      await TiFlowService.submitCounterOffer(taskId, modifiedQuestionnaire);
      await loadActiveRequests(); // Refresh the list
      setShowQuestionnaire(false);
      onRequestSubmitted?.();
    } catch (err) {
      console.error('Failed to submit counter-offer:', err);
      setError('Fehler beim Senden des Gegenangebots');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadActiveRequests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return '#3b82f6';
      case 'in_progress(Anfragender)': return '#f59e0b';
      case 'in_progress(Bearbeiter)': return '#8b5cf6';
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'completed': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return 'Empfangen';
      case 'in_progress(Anfragender)': return 'In Bearbeitung (Apotheke)';
      case 'in_progress(Bearbeiter)': return 'In Bearbeitung (Arzt)';
      case 'accepted': return 'Akzeptiert';
      case 'rejected': return 'Abgelehnt';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const canTakeAction = (status: string) => {
    return ['received', 'in_progress(Bearbeiter)'].includes(status);
  };

  if (showQuestionnaire && viewingRequest) {
    return (
      <div className="active-requests-section">
        <div className="section-header">
          <h2>📋 Anfragedetails</h2>
          <button 
            onClick={() => setShowQuestionnaire(false)}
            className="back-button"
          >
            ← Zurück zur Liste
          </button>
        </div>

        <div className="request-details">
          <div className="request-info">
            <h3>{viewingRequest.type}</h3>
            <p><strong>Status:</strong> <span style={{ color: getStatusColor(viewingRequest.status) }}>
              {getStatusText(viewingRequest.status)}
            </span></p>
            <p><strong>Erstellt:</strong> {new Date(viewingRequest.requestDate).toLocaleString()}</p>
            <p><strong>Letzte Aktualisierung:</strong> {new Date(viewingRequest.lastUpdated).toLocaleString()}</p>
          </div>

          {viewingRequest.questionnaireResponse && (
            <div className="questionnaire-container">
              <QuestionnaireRenderer 
                questionnaire={{
                  resourceType: 'Questionnaire',
                  status: 'active',
                  title: viewingRequest.type,
                  item: [
                    {
                      linkId: 'details',
                      text: 'Request Details',
                      type: 'display'
                    }
                  ]
                }}
                prescription={null}
                operationCode=""
                onClose={() => setShowQuestionnaire(false)}
                onRequestSubmitted={onRequestSubmitted}
              />
            </div>
          )}

          {canTakeAction(viewingRequest.status) && (
            <div className="action-buttons">
              <button 
                onClick={() => handleAcceptTask(viewingRequest.id)}
                disabled={actionLoading}
                className="accept-button"
              >
                {actionLoading ? 'Wird bearbeitet...' : '✅ Akzeptieren'}
              </button>
              <button 
                onClick={() => handleCounterOffer(viewingRequest.id)}
                disabled={actionLoading}
                className="counter-offer-button"
              >
                {actionLoading ? 'Wird bearbeitet...' : '🔄 Gegenangebot'}
              </button>
              <button 
                onClick={() => handleRejectTask(viewingRequest.id)}
                disabled={actionLoading}
                className="reject-button"
              >
                {actionLoading ? 'Wird bearbeitet...' : '❌ Ablehnen'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="active-requests-section">
      <div className="section-header">
        <h2>📋 Aktive Anfragen</h2>
        <button onClick={loadActiveRequests} disabled={isLoading}>
          {isLoading ? '⟳' : '🔄'} Aktualisieren
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError(null)}>Schließen</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading">
          <p>⏳ Lade aktive Anfragen...</p>
        </div>
      ) : activeRequests.length === 0 ? (
        <div className="no-requests">
          <p>📭 Keine aktiven Anfragen</p>
          <p>Hier werden Ihre gesendeten Anfragen angezeigt.</p>
        </div>
      ) : (
        <div className="requests-list">
          {activeRequests.map(request => (
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
                <p><strong>ID:</strong> {request.id}</p>
                <p><strong>Art:</strong> {request.kind}</p>
                <p><strong>Erstellt:</strong> {new Date(request.requestDate).toLocaleString()}</p>
                <p><strong>Letzte Aktualisierung:</strong> {new Date(request.lastUpdated).toLocaleString()}</p>
              </div>

              <div className="request-actions">
                <button 
                  onClick={() => viewRequest(request.id)}
                  className="view-button"
                >
                  👀 Details ansehen
                </button>
                
                {canTakeAction(request.status) && (
                  <>
                    <button 
                      onClick={() => handleAcceptTask(request.id)}
                      disabled={actionLoading}
                      className="quick-accept-button"
                    >
                      ✅ Akzeptieren
                    </button>
                    <button 
                      onClick={() => handleRejectTask(request.id)}
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
