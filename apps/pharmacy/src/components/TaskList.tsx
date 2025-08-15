import { useState, useEffect } from 'react';
import { TiFlowService } from '../services/tiFlowService';
import { QuestionnaireResponseViewer } from './QuestionnaireResponseViewer';
import type { FlowTask, QuestionnaireResponse } from '../types';

export function TaskList() {
  const [tasks, setTasks] = useState<FlowTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionnaireResponse, setSelectedQuestionnaireResponse] = useState<QuestionnaireResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const userTasks = await TiFlowService.getTasksForUser('1-AVS-12345678901');
      setTasks(userTasks);
      setError(null);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks from backend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDetails = async (task: FlowTask) => {
    try {
      // Extract questionnaire response ID from the input reference
      const questionnaireResponseRef = task.input?.find((input: any) => 
        input.type.text === 'questionnaire-response'
      )?.valueReference?.reference;
      
      if (questionnaireResponseRef) {
        const questionnaireResponseId = questionnaireResponseRef.replace('QuestionnaireResponse/', '');
        const questionnaireResponse = await TiFlowService.getQuestionnaireResponseById(questionnaireResponseId);
        setSelectedQuestionnaireResponse(questionnaireResponse);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load questionnaire response:', err);
      setError('Failed to load questionnaire response details');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedQuestionnaireResponse(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return '#f59e0b';
      case 'received': return '#3b82f6';
      case 'in_progress(Anfragender)': return '#8b5cf6';
      case 'in_progress(Bearbeiter)': return '#8b5cf6';
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'completed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const getOtherParty = (task: FlowTask) => {
    const requesterOrg = task.requester.reference.replace('Organization/', '');
    const receiverOrg = task.for.reference.replace('Organization/', '');
    
    // If we are the requester, show the receiver, otherwise show the requester
    return requesterOrg === 'pharmacy-app' ? receiverOrg : requesterOrg;
  };

  if (isLoading) {
    return (
      <div className="task-list loading">
        <p>Lade Aufgaben...</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header">
        <h3>📋 Aktive Anfragen</h3>
        <button onClick={loadTasks} className="refresh-btn">
          🔄 Aktualisieren
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="no-tasks">
          <p>Keine Aufgaben vorhanden</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <span 
                  className="task-status"
                  style={{ 
                    backgroundColor: getStatusColor(task.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8em',
                    fontWeight: 'bold'
                  }}
                >
                  {task.businessStatus.text}
                </span>
                <span className="task-id">#{task.id}</span>
              </div>
              
              <div className="task-body">
                <h4>{task.description}</h4>
                <p><strong>Partner:</strong> {getOtherParty(task)}</p>
                <p><strong>Erstellt:</strong> {formatDate(task.authoredOn)}</p>
                <p><strong>Aktualisiert:</strong> {formatDate(task.lastModified)}</p>
              </div>
              
              <div className="task-actions">
                <button 
                  onClick={() => handleShowDetails(task)}
                  className="details-btn"
                >
                  📋 Anfragedetails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for showing questionnaire details */}
      {isModalOpen && selectedQuestionnaireResponse && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Anfragedetails</h2>
              <button onClick={closeModal} className="close-btn">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <QuestionnaireResponseViewer 
                questionnaireResponse={selectedQuestionnaireResponse}
                onClose={closeModal}
                standalone={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
