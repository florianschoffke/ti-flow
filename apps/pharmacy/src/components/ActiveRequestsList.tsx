import { useState, useEffect } from 'react';
import type { ActiveRequest, RequestDetails, Questionnaire } from '../types';
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

  const handleRefresh = () => {
    loadActiveRequests();
  };

  const handleViewRequest = (requestId: string) => {
    viewRequest(requestId);
  };

  const handleCloseQuestionnaire = () => {
    setShowQuestionnaire(false);
    setViewingRequest(null);
  };

  useEffect(() => {
    loadActiveRequests();
  }, []);

  useEffect(() => {
    if (onRequestSubmitted) {
      loadActiveRequests();
    }
  }, [onRequestSubmitted]);

  const getStatusClassName = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'submitted';
      case 'in-progress':
        return 'in-progress';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'submitted';
    }
  };

  return (
    <>
      <div className="active-requests-list">
        <div className="requests-header">
          <h3>Laufende Anfragen</h3>
          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Aktualisieren"
          >
            🔄
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {activeRequests.length === 0 ? (
          <div className="no-requests">
            <p>Keine aktiven Anfragen vorhanden.</p>
            <small>Anfragen werden hier angezeigt, nachdem sie eingereicht wurden.</small>
          </div>
        ) : (
          <div className="requests-list">
            {activeRequests.map((request) => (
              <div key={request.id} className="request-item">
                <div className="request-header">
                  <div className="request-kind">{request.kind}</div>
                  <div className={`request-status ${getStatusClassName(request.status)}`}>
                    {request.status}
                  </div>
                </div>
                <div className="request-details">
                  <div>
                    <strong>Eingereicht:</strong> {new Date(request.requestDate).toLocaleString('de-DE')}
                  </div>
                  <div>
                    <strong>Letzte Änderung:</strong> {new Date(request.lastUpdated).toLocaleString('de-DE')}
                  </div>
                </div>
                <div className="request-actions">
                  <button
                    className="view-request-btn"
                    onClick={() => handleViewRequest(request.id)}
                    disabled={isLoading}
                  >
                    Anfrage anzeigen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showQuestionnaire && viewingRequest && viewingRequest.questionnaireResponse && (
        <QuestionnaireRenderer
          questionnaire={{
            resourceType: 'Questionnaire',
            title: `${viewingRequest.kind} (Nur-Lese-Ansicht)`,
            status: 'completed',
            item: (viewingRequest.questionnaireResponse?.item || []).map(item => ({
              type: 'display',
              linkId: item.linkId,
              text: `${item.linkId}: ${item.answer?.[0]?.valueString || JSON.stringify(item.answer?.[0]?.valueQuantity) || 'Keine Antwort'}`
            }))
          } as Questionnaire}
          prescription={null}
          operationCode=""
          onClose={handleCloseQuestionnaire}
        />
      )}
    </>
  );
}