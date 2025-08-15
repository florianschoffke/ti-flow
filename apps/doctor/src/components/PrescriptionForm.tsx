import { useState, useEffect } from 'react';
import { DoctorFlowService } from '../services/doctorFlowService';
import { PatientService, type Patient } from '../services/patientService';

interface PrescriptionFormProps {
  onPrescriptionCreated?: () => void;
  taskId?: string; // Add taskId for closing the task
  prefillData?: {
    patientId?: string;
    medication?: string;
    pzn?: string | number;
    dosage?: string;
    packages?: string | number;
  };
}

export function PrescriptionForm({ onPrescriptionCreated, prefillData, taskId }: PrescriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionResult, setPrescriptionResult] = useState<{ prescriptionId: string; secret: string } | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  // Helper function to check if a field is prefilled
  const isPrefilled = (fieldName: string) => {
    if (!prefillData) return false;
    
    switch (fieldName) {
      case 'patientId': return prefillData.patientId !== undefined && prefillData.patientId !== '';
      case 'medication': return prefillData.medication !== undefined && prefillData.medication !== '';
      case 'pzn': return prefillData.pzn !== undefined && prefillData.pzn !== '';
      case 'dosage': return prefillData.dosage !== undefined && prefillData.dosage !== '';
      case 'packages': return prefillData.packages !== undefined && prefillData.packages !== '';
      default: return false;
    }
  };

  // Default values for non-prefilled fields
  const getDefaultValue = (fieldName: string, prefilledValue?: string | number) => {
    if (prefilledValue !== undefined && prefilledValue !== '') {
      return prefilledValue.toString();
    }
    
    switch (fieldName) {
      case 'patientId': return 'pat-001'; // Default to first patient (Anna Müller)
      case 'medication': return 'Ibuprofen 400mg';
      case 'pzn': return '12345678';
      case 'dosage': return '1 Tablette täglich';
      case 'packages': return '1';
      default: return '';
    }
  };
  
  const [formData, setFormData] = useState({
    patientId: prefillData?.patientId || '',
    medication: getDefaultValue('medication', prefillData?.medication),
    pzn: getDefaultValue('pzn', prefillData?.pzn),
    dosage: getDefaultValue('dosage', prefillData?.dosage),
    packages: getDefaultValue('packages', prefillData?.packages)
  });

  useEffect(() => {
    // Load mock patients
    setPatients(PatientService.getMockPatients());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Call mock e-prescription service
      const result = await DoctorFlowService.createEPrescription(formData);
      
      setPrescriptionResult(result);
      setSuccess(`E-Rezept ${result.prescriptionId} erfolgreich erstellt!`);
    } catch (err) {
      setError('Fehler beim Erstellen des E-Rezepts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTask = async () => {
    if (!prescriptionResult || !taskId) return;
    
    setIsClosing(true);
    try {
      await DoctorFlowService.closeTask(taskId, prescriptionResult);
      setSuccess('Vorgang erfolgreich abgeschlossen!');
      
      // Reset form
      setFormData({
        patientId: '',
        medication: '',
        pzn: '',
        dosage: '',
        packages: ''
      });
      setPrescriptionResult(null);
      
      onPrescriptionCreated?.();
    } catch (err) {
      setError('Fehler beim Abschließen des Vorgangs');
    } finally {
      setIsClosing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="card">
      <h3>📝 E-Rezept erstellen</h3>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {prescriptionResult ? (
        // Show prescription result and close task button
        <div className="prescription-result">
          <div className="result-section">
            <h4>✅ E-Rezept erfolgreich erstellt</h4>
            <div className="prescription-details">
              <p><strong>Rezept-ID:</strong> {prescriptionResult.prescriptionId}</p>
              <p><strong>Geheimnis:</strong> {"*".repeat(prescriptionResult.secret.length)}</p>
            </div>
          </div>
          
          <button 
            onClick={handleCloseTask}
            disabled={isClosing}
            className="btn close-task-btn"
          >
            {isClosing ? (
              <>
                <span className="loading"></span>
                <span style={{ marginLeft: '8px' }}>Wird abgeschlossen...</span>
              </>
            ) : (
              '✅ Vorgang abschließen'
            )}
          </button>
        </div>
      ) : (
        // Show prescription form
        <form onSubmit={handleSubmit}>
        <div className="form-group">
          {isPrefilled('patientId') && (
            <div className="prefilled-indicator">
              📝 Aus Rezeptanfrage übernommen
            </div>
          )}
          {!isPrefilled('patientId') && (
            <div className="default-indicator">
              📋 Aus vorheriger Verordnung übernommen
            </div>
          )}
          <label htmlFor="patientId">Patient auswählen</label>
          <select
            id="patientId"
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            required
            style={{
              color: isPrefilled('patientId') ? 'inherit' : 'inherit',
              fontStyle: isPrefilled('patientId') ? 'italic' : 'normal'
            }}
          >
            <option value="">Bitte wählen...</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.insuranceNumber})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          {isPrefilled('medication') && (
            <div className="prefilled-indicator">
              📝 Aus Rezeptanfrage übernommen
            </div>
          )}
          {!isPrefilled('medication') && (
            <div className="default-indicator">
              � Aus vorheriger Verordnung übernommen
            </div>
          )}
          <label htmlFor="medication">Medikament</label>
          <input
            type="text"
            id="medication"
            name="medication"
            value={formData.medication}
            onChange={handleChange}
            placeholder="z.B. Ibuprofen 400mg"
            required
            style={{
              color: isPrefilled('medication') ? 'inherit' : 'inherit',
              fontStyle: isPrefilled('medication') ? 'italic' : 'normal'
            }}
          />
        </div>

        <div className="form-group">
          {isPrefilled('pzn') && (
            <div className="prefilled-indicator">
              📝 Aus Rezeptanfrage übernommen
            </div>
          )}
          {!isPrefilled('pzn') && (
            <div className="default-indicator">
              � Aus vorheriger Verordnung übernommen
            </div>
          )}
          <label htmlFor="pzn">PZN (Pharmazentralnummer)</label>
          <input
            type="number"
            id="pzn"
            name="pzn"
            value={formData.pzn}
            onChange={handleChange}
            placeholder="z.B. 12345678"
            style={{
              color: isPrefilled('pzn') ? 'inherit' : 'inherit',
              fontStyle: isPrefilled('pzn') ? 'italic' : 'normal'
            }}
          />
        </div>

        <div className="form-group">
          {isPrefilled('dosage') && (
            <div className="prefilled-indicator">
              📝 Aus Rezeptanfrage übernommen
            </div>
          )}
          {!isPrefilled('dosage') && (
            <div className="default-indicator">
              � Aus vorheriger Verordnung übernommen
            </div>
          )}
          <label htmlFor="dosage">Dosierung</label>
          <input
            type="text"
            id="dosage"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            placeholder="z.B. 1 Tablette"
            required
            style={{
              color: isPrefilled('dosage') ? 'inherit' : 'inherit',
              fontStyle: isPrefilled('dosage') ? 'italic' : 'normal'
            }}
          />
        </div>

        <div className="form-group">
          {isPrefilled('packages') && (
            <div className="prefilled-indicator">
              📝 Aus Rezeptanfrage übernommen
            </div>
          )}
          {!isPrefilled('packages') && (
            <div className="default-indicator">
              � Aus vorheriger Verordnung übernommen
            </div>
          )}
          <label htmlFor="packages">Anzahl Packungen</label>
          <input
            type="number"
            id="packages"
            name="packages"
            value={formData.packages}
            onChange={handleChange}
            placeholder="z.B. 2"
            min="1"
            style={{
              color: isPrefilled('packages') ? 'inherit' : 'inherit',
              fontStyle: isPrefilled('packages') ? 'italic' : 'normal'
            }}
          />
        </div>

        <button 
          type="submit" 
          className="btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading"></span>
              <span style={{ marginLeft: '8px' }}>Wird erstellt...</span>
            </>
          ) : (
            '💊 E-Rezept erstellen'
          )}
        </button>
      </form>
      )}
    </div>
  );
}
