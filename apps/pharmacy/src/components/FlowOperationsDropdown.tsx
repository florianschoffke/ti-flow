import { useState, useRef, useEffect } from 'react';
import type { CodeSystemConcept, Prescription, QuestionnaireResponse, FhirBundle } from '../types';
import { QuestionnaireResponseViewer } from './QuestionnaireResponseViewer';
import TiFlowService from '../services/tiFlowService';

interface FlowOperationsDropdownProps {
  prescription: Prescription;
  availableOperations: CodeSystemConcept[];
  fhirBundle?: FhirBundle;
  onRequestSubmitted?: () => void;
}

export function FlowOperationsDropdown({ prescription, availableOperations, fhirBundle, onRequestSubmitted }: FlowOperationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionnaireResponse, setShowQuestionnaireResponse] = useState(false);
  const [currentQuestionnaireResponse, setCurrentQuestionnaireResponse] = useState<QuestionnaireResponse | null>(null);
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
          const populatedResponse = await TiFlowService.populateQuestionnaire(operation.code, fhirBundle);
          
          if (populatedResponse) {
            console.log('✅ Successfully populated questionnaire:', populatedResponse);
            setCurrentQuestionnaireResponse(populatedResponse);
            setShowQuestionnaireResponse(true);
            return;
          } else {
            console.log('ℹ️ No populated questionnaire returned, falling back to basic form');
          }
        } catch (error) {
          console.warn('⚠️ Failed to populate questionnaire, falling back to basic form:', error);
        }
      } else {
        console.log('ℹ️ No FHIR bundle available, creating basic questionnaire response');
      }
      
      // Fallback: Create a basic questionnaire response for this document operation
      const questionnaireResponse: QuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        questionnaire: operation.display || operation.code,
        status: 'in-progress',
        item: [
          {
            linkId: 'prescription_id',
            answer: [{
              valueString: prescription.id
            }]
          },
          {
            linkId: 'patient_id',
            answer: [{
              valueString: prescription.patientId
            }]
          },
          {
            linkId: 'medication_name',
            answer: [{
              valueString: prescription.medication
            }]
          },
          {
            linkId: 'description',
            answer: []
          }
        ]
      };
      
      setCurrentQuestionnaireResponse(questionnaireResponse);
      setShowQuestionnaireResponse(true);
      
    } catch (error) {
      console.error('❌ Operation failed:', error);
      // You can add error handling/notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseQuestionnaireResponse = () => {
    setShowQuestionnaireResponse(false);
    setCurrentQuestionnaireResponse(null);
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
      
      {showQuestionnaireResponse && currentQuestionnaireResponse && (
        <QuestionnaireResponseViewer
          questionnaireResponse={currentQuestionnaireResponse}
          onClose={handleCloseQuestionnaireResponse}
          onSubmit={async (updatedResponse) => {
            try {
              console.log('📤 Submitting updated questionnaire response:', updatedResponse);
              const result = await TiFlowService.submitFlowRequest(updatedResponse);
              console.log('✅ Flow request submitted successfully:', result);
              
              if (onRequestSubmitted) {
                onRequestSubmitted();
              }
            } catch (error) {
              console.error('❌ Failed to submit flow request:', error);
              throw error; // Re-throw to let QuestionnaireResponseViewer handle the error UI
            }
          }}
        />
      )}
    </>
  );
}
