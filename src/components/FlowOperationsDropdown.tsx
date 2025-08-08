import { useState, useRef, useEffect } from 'react';
import type { CodeSystemConcept, Prescription, Questionnaire, FHIRParameters } from '../types';
import { TiFlowService } from '../services/tiFlowService';
import { QuestionnaireRenderer } from './QuestionnaireRenderer';

interface FlowOperationsDropdownProps {
  prescription: Prescription;
  availableOperations: CodeSystemConcept[];
  onRequestSubmitted?: () => void;
}

export function FlowOperationsDropdown({ prescription, availableOperations, onRequestSubmitted }: FlowOperationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentOperationCode, setCurrentOperationCode] = useState<string>('');
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

  const handleOperationClick = async (operation: CodeSystemConcept) => {
    setIsLoading(true);
    setIsOpen(false);
    
    try {
      console.log(`🔄 Executing operation: ${operation.display} for prescription ${prescription.id}`);
      const result: FHIRParameters = await TiFlowService.populatePrescription(prescription, operation.code);
      console.log('✅ Operation completed:', result);
      
      // Extract questionnaire from FHIR Parameters
      const questionnaireParam = result.parameter?.find(p => p.name === 'questionnaire');
      if (questionnaireParam?.resource) {
        setCurrentQuestionnaire(questionnaireParam.resource as Questionnaire);
        setCurrentOperationCode(operation.code);
        setShowQuestionnaire(true);
      } else {
        console.error('No questionnaire found in response');
      }
      
    } catch (error) {
      console.error('❌ Operation failed:', error);
      // You can add error handling/notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseQuestionnaire = () => {
    setShowQuestionnaire(false);
    setCurrentQuestionnaire(null);
    setCurrentOperationCode('');
  };

  if (availableOperations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flow-operations-dropdown" ref={dropdownRef}>
        <button 
          className={`dropdown-trigger ${isLoading ? 'loading' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          title="Flow-Operationen"
        >
          {isLoading ? '...' : '⚙️'}
        </button>
        
        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-header">
              Aktionen für {prescription.compositionType}
            </div>
            {availableOperations.map((operation) => (
              <button
                key={operation.code}
                className="dropdown-item"
                onClick={() => handleOperationClick(operation)}
                title={operation.definition}
              >
                {operation.display}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {showQuestionnaire && currentQuestionnaire && (
        <QuestionnaireRenderer
          questionnaire={currentQuestionnaire}
          prescription={prescription}
          operationCode={currentOperationCode}
          onClose={handleCloseQuestionnaire}
          onRequestSubmitted={onRequestSubmitted}
        />
      )}
    </>
  );
}
