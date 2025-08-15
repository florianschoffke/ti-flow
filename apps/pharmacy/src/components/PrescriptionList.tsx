import type { Prescription, CodeSystemConcept, FhirBundle } from '../types';
import { FlowOperationsDropdown } from './FlowOperationsDropdown';
import { PrescriptionLoaderService } from '../services/prescriptionLoaderService';

interface PrescriptionListProps {
  prescriptions: Prescription[];
  availableOperations: CodeSystemConcept[];
  fhirBundles?: FhirBundle[];
  onRequestSubmitted?: () => void;
}

export function PrescriptionList({ prescriptions, availableOperations, fhirBundles, onRequestSubmitted }: PrescriptionListProps) {
  if (prescriptions.length === 0) {
    return (
      <div className="prescription-list">
        <h3>E-Rezepte</h3>
        <p>Keine E-Rezepte verfügbar</p>
      </div>
    );
  }

  const getOperationsForPrescription = (prescription: Prescription): CodeSystemConcept[] => {
    // Find the concept that matches the prescription's compositionType
    const matchingConcept = availableOperations.find(op => 
      op.code === prescription.compositionType
    );
    
    // Return the nested concepts (subconcepts) if they exist
    return matchingConcept?.concept || [];
  };

  const getFhirBundleForPrescription = (prescriptionId: string): FhirBundle | undefined => {
    return PrescriptionLoaderService.getFhirBundleForPrescription(prescriptionId, fhirBundles || []) || undefined;
  };

  return (
    <div className="prescription-list">
      <h3>E-Rezepte ({prescriptions.length})</h3>
      <div className="prescriptions">
        {prescriptions.map((prescription) => {
          const operations = getOperationsForPrescription(prescription);
          const prescriptionFhirBundle = getFhirBundleForPrescription(prescription.id);
          
          return (
            <div key={prescription.id} className="prescription-card">
              <div className="prescription-header">
                <h4>{prescription.medication}</h4>
                <div className="header-actions">
                  <span className="composition-type">
                    {prescription.compositionType}
                  </span>
                  {operations.length > 0 ? (
                    <FlowOperationsDropdown 
                      prescription={prescription}
                      availableOperations={operations}
                      fhirBundle={prescriptionFhirBundle}
                      onRequestSubmitted={onRequestSubmitted}
                    />
                  ) : (
                    <button 
                      className="no-operations-btn"
                      title={`Keine Operationen für ${prescription.compositionType} verfügbar`}
                      disabled
                    >
                      ⚙️ Keine Aktionen
                    </button>
                  )}
                  <span className={`status status-${prescription.status}`}>
                    {prescription.status === 'pending' ? 'Offen' : 
                     prescription.status === 'dispensed' ? 'Abgegeben' : 'Storniert'}
                  </span>
                </div>
              </div>
              <div className="prescription-details">
                <div className="prescription-row">
                  <span className="label">Dosierung:</span>
                  <span className="value">{prescription.dosage}</span>
                </div>
                <div className="prescription-row">
                  <span className="label">Menge:</span>
                  <span className="value">{prescription.quantity} Stück</span>
                </div>
                <div className="prescription-row">
                  <span className="label">Arzt:</span>
                  <span className="value">{prescription.doctor}</span>
                </div>
                <div className="prescription-row">
                  <span className="label">Ausstellungsdatum:</span>
                  <span className="value">{prescription.issueDate}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
