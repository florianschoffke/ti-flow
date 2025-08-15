import { useState, useRef, useEffect } from 'react';
import type { CodeSystemConcept, Questionnaire } from '../types';
import { tiFlowService } from '../services/tiFlowService';
// import { QuestionnaireRenderer } from './QuestionnaireRenderer'; // TODO: Update to use QuestionnaireResponseViewer

interface RequestOperationsProps {
  availableRequests: CodeSystemConcept[];
  isLoading: boolean;
  onRequestSubmitted?: () => void;
}

export function RequestOperations({ availableRequests, isLoading, onRequestSubmitted }: RequestOperationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentRequestCode, setCurrentRequestCode] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRequestClick = async (request: CodeSystemConcept) => {
    setIsProcessing(true);
    setIsOpen(false);
    
    try {
      console.log(`🔄 Executing request: ${request.display} (${request.code})`);
      
      // Get the questionnaire from the backend
      const questionnaire = await tiFlowService.getRequestOperationQuestionnaire(request.code);
      console.log('✅ Questionnaire loaded:', questionnaire);
      
      setCurrentQuestionnaire(questionnaire);
      setCurrentRequestCode(request.code);
      setShowQuestionnaire(true);
      
    } catch (error) {
      console.error('❌ Request failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseQuestionnaire = () => {
    setShowQuestionnaire(false);
    setCurrentQuestionnaire(null);
    setCurrentRequestCode('');
  };

  if (availableRequests.length === 0 && !isLoading) {
    return (
      <div className="request-operations-empty">
        <p>Keine Anforderungen verfügbar</p>
      </div>
    );
  }

  return (
    <>
      <div className="request-operations" ref={dropdownRef}>
        <button 
          className={`btn btn-request ${isProcessing ? 'loading' : ''} ${isLoading ? 'disabled' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isProcessing || isLoading}
        >
          {isProcessing ? 'Verarbeite...' : isLoading ? 'Lädt...' : 'Anforderungen'}
        </button>
        
        {isOpen && (
          <div className="dropdown-menu requests-menu">
            <div className="dropdown-header">
              Verfügbare Anforderungen
            </div>
            {availableRequests.map((request) => (
              <button
                key={request.code}
                className="dropdown-item request-item"
                onClick={() => handleRequestClick(request)}
                title={request.definition}
              >
                {request.display}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {showQuestionnaire && currentQuestionnaire && (
        <div className="questionnaire-placeholder">
          <p>🚧 Request operations will be updated to use QuestionnaireResponseViewer</p>
          <button onClick={handleCloseQuestionnaire}>Close</button>
        </div>
      )}
    </>
  );
}
