import { useState, useRef, useEffect } from 'react';
import type { CodeSystemConcept, Questionnaire, FHIRParameters } from '../types';
import { TiFlowService } from '../services/tiFlowService';
import { QuestionnaireRenderer } from './QuestionnaireRenderer';

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
      const result: FHIRParameters = await TiFlowService.populateRequest(request.code);
      console.log('✅ Request populated:', result);
      
      // Extract questionnaire from FHIR Parameters
      const questionnaireParam = result.parameter?.find(p => p.name === 'questionnaire');
      if (questionnaireParam?.resource) {
        setCurrentQuestionnaire(questionnaireParam.resource as Questionnaire);
        setCurrentRequestCode(request.code);
        setShowQuestionnaire(true);
      } else {
        console.error('No questionnaire found in response');
      }
      
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
        <QuestionnaireRenderer
          questionnaire={currentQuestionnaire}
          prescription={null} // No prescription for requests
          operationCode={currentRequestCode}
          onClose={handleCloseQuestionnaire}
          onRequestSubmitted={onRequestSubmitted}
        />
      )}
    </>
  );
}
