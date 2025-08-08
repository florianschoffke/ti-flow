import { useState, useEffect } from 'react';

interface Request {
  id: string;
  type: string;
  patientName: string;
  pharmacyName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  details: string;
}

export function RequestsList() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      // Mock API call to load requests from pharmacies
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for pharmacy requests
      setRequests([
        {
          id: 'req-001',
          type: 'Rezeptanforderung',
          patientName: 'Anna Müller',
          pharmacyName: 'Stadt-Apotheke Berlin',
          status: 'pending',
          requestDate: new Date().toISOString(),
          details: 'Anfrage für Wiederholung der letzten Verschreibung'
        },
        {
          id: 'req-002',
          type: 'Dosierungsanfrage',
          patientName: 'Hans Schmidt',
          pharmacyName: 'Apotheke am Markt',
          status: 'approved',
          requestDate: new Date(Date.now() - 3600000).toISOString(),
          details: 'Rückfrage zur Dosierung von Metformin'
        },
        {
          id: 'req-003',
          type: 'Substitutionsanfrage',
          patientName: 'Maria Weber',
          pharmacyName: 'Löwen-Apotheke',
          status: 'pending',
          requestDate: new Date(Date.now() - 7200000).toISOString(),
          details: 'Anfrage für Aut-idem Substitution'
        }
      ]);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      // Mock API call to update request status
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
          : req
      ));
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-badge pending';
      case 'approved': return 'status-badge active';
      case 'rejected': return 'status-badge';
      default: return 'status-badge';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'approved': return 'Genehmigt';
      case 'rejected': return 'Abgelehnt';
      default: return status;
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3>📋 Apotheken-Anfragen</h3>
        <button 
          className="btn btn-secondary"
          onClick={loadRequests}
          disabled={isLoading}
        >
          {isLoading ? <span className="loading"></span> : '🔄'}
        </button>
      </div>
      
      {requests.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
          {isLoading ? 'Lade Anfragen...' : 'Keine Anfragen vorhanden.'}
        </p>
      ) : (
        <div>
          {requests.map((request) => (
            <div key={request.id} className="list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4>{request.type}</h4>
                <span className={getStatusBadgeClass(request.status)}>
                  {getStatusText(request.status)}
                </span>
              </div>
              
              <p><strong>Patient:</strong> {request.patientName}</p>
              <p><strong>Apotheke:</strong> {request.pharmacyName}</p>
              <p><strong>Eingegangen:</strong> {new Date(request.requestDate).toLocaleString('de-DE')}</p>
              <p><strong>Details:</strong> {request.details}</p>
              
              {request.status === 'pending' && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn"
                    onClick={() => handleRequestAction(request.id, 'approve')}
                    style={{ fontSize: '0.9em', padding: '6px 12px' }}
                  >
                    ✅ Genehmigen
                  </button>
                  <button 
                    className="btn"
                    onClick={() => handleRequestAction(request.id, 'reject')}
                    style={{ 
                      fontSize: '0.9em', 
                      padding: '6px 12px',
                      background: '#dc2626'
                    }}
                  >
                    ❌ Ablehnen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
