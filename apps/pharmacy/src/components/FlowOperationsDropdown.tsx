import { useState, useRef, useEffect } from 'react';
import type { CodeSystemConcept, Prescription, Questionnaire, QuestionnaireResponse, FhirBundle } from '../types';
import { QuestionnaireRenderer } from './QuestionnaireRenderer';
import { QuestionnaireResponseViewer } from './QuestionnaireResponseViewer';
import { tiFlowService } from '../services/tiFlowService';

interface FlowOperationsDropdownProps {
  prescription: Prescription;
  availableOperations: CodeSystemConcept[];
  fhirBundle?: FhirBundle;
  onRequestSubmitted?: () => void;
}

export function FlowOperationsDropdown({ prescription, availableOperations, fhirBundle, onRequestSubmitted }: FlowOperationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showQuestionnaireResponse, setShowQuestionnaireResponse] = useState(false);
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentQuestionnaireResponse, setCurrentQuestionnaireResponse] = useState<QuestionnaireResponse | null>(null);
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
      
      // Check if we have a FHIR bundle to use for population
      if (fhirBundle) {
        try {
          // Try to populate questionnaire using the smart endpoint
          console.log(`📋 Attempting to populate questionnaire with ID: ${operation.code}`);
          const populatedResponse = await tiFlowService.populateQuestionnaire(operation.code, fhirBundle);
          
          if (populatedResponse) {
            console.log('✅ Successfully populated questionnaire:', populatedResponse);
            setCurrentQuestionnaireResponse(populatedResponse);
            setCurrentOperationCode(operation.code);
            setShowQuestionnaireResponse(true);
            return;
          } else {
            console.log('ℹ️ No populated questionnaire returned, falling back to basic form');
          }
        } catch (error) {
          console.warn('⚠️ Failed to populate questionnaire, falling back to basic form:', error);
        }
      } else {
        console.log('ℹ️ No FHIR bundle available, using basic questionnaire');
      }
      
      // Fallback: Create a basic questionnaire for this document operation
      const questionnaire: Questionnaire = {
        resourceType: 'Questionnaire',
        title: operation.display || operation.code,
        status: 'active',
        item: [
          {
            linkId: 'prescription-id',
            text: 'Rezept-ID',
            type: 'string',
            required: true
          },
          {
            linkId: 'patient-id',
            text: 'Patient-ID',
            type: 'string',
            required: true
          },
          {
            linkId: 'description',
            text: 'Beschreibung',
            type: 'text',
            required: false
          }
        ]
      };
      
      setCurrentQuestionnaire(questionnaire);
      setCurrentOperationCode(operation.code);
      setShowQuestionnaire(true);
      
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

  const handleCloseQuestionnaireResponse = () => {
    setShowQuestionnaireResponse(false);
    setCurrentQuestionnaireResponse(null);
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
          title="Verfügbare Aktionen für dieses E-Rezept"
        >
          {isLoading ? 'Lädt...' : '⚙️ Aktionen'}
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

      {showQuestionnaireResponse && currentQuestionnaireResponse && (
        <QuestionnaireResponseViewer
          questionnaireResponse={currentQuestionnaireResponse}
          onClose={handleCloseQuestionnaireResponse}
          onSubmit={async (updatedResponse) => {
            console.log('📤 Submitting updated questionnaire response:', updatedResponse);
            // Here you could send the response to the backend
            // For now, just log it and close
            if (onRequestSubmitted) {
              onRequestSubmitted();
            }
          }}
        />
      )}
    </>
  );
}
