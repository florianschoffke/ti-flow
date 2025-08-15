import { useState } from 'react';
import { DoctorFlowService } from '../services/doctorFlowService';

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
  
  const [formData, setFormData] = useState({
    patientId: prefillData?.patientId || '',
    medication: prefillData?.medication || '',
    pzn: prefillData?.pzn?.toString() || '',
    dosage: prefillData?.dosage || '',
    packages: prefillData?.packages?.toString() || ''
  });

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
          <label htmlFor="patientId">Patient auswählen</label>
          <select
            id="patientId"
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            required
          >
            <option value="">Bitte wählen...</option>
            <option value="pat-001">Anna Müller (A123456789)</option>
            <option value="pat-002">Hans Schmidt (B987654321)</option>
            <option value="pat-003">Maria Weber (C456789123)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="medication">Medikament</label>
          <input
            type="text"
            id="medication"
            name="medication"
            value={formData.medication}
            onChange={handleChange}
            placeholder="z.B. Ibuprofen 400mg"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="pzn">PZN (Pharmazentralnummer)</label>
          <input
            type="number"
            id="pzn"
            name="pzn"
            value={formData.pzn}
            onChange={handleChange}
            placeholder="z.B. 12345678"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dosage">Dosierung</label>
          <input
            type="text"
            id="dosage"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            placeholder="z.B. 1 Tablette"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="packages">Anzahl Packungen</label>
          <input
            type="number"
            id="packages"
            name="packages"
            value={formData.packages}
            onChange={handleChange}
            placeholder="z.B. 2"
            min="1"
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
