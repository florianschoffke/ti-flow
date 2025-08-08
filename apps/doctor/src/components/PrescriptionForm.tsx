import { useState } from 'react';

interface PrescriptionFormProps {
  onPrescriptionCreated?: () => void;
}

export function PrescriptionForm({ onPrescriptionCreated }: PrescriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    patientId: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    indication: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Mock API call to create prescription
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate prescription creation
      const prescriptionId = `rx-${Date.now()}`;
      
      setSuccess(`E-Rezept ${prescriptionId} erfolgreich erstellt!`);
      setFormData({
        patientId: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        indication: '',
        notes: ''
      });
      
      onPrescriptionCreated?.();
    } catch (err) {
      setError('Fehler beim Erstellen des E-Rezepts');
    } finally {
      setIsLoading(false);
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
          <label htmlFor="frequency">Häufigkeit</label>
          <select
            id="frequency"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            required
          >
            <option value="">Bitte wählen...</option>
            <option value="1x täglich">1x täglich</option>
            <option value="2x täglich">2x täglich</option>
            <option value="3x täglich">3x täglich</option>
            <option value="Bei Bedarf">Bei Bedarf</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="duration">Behandlungsdauer</label>
          <input
            type="text"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="z.B. 7 Tage"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="indication">Indikation</label>
          <input
            type="text"
            id="indication"
            name="indication"
            value={formData.indication}
            onChange={handleChange}
            placeholder="z.B. Schmerzen, Entzündung"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Zusätzliche Hinweise</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Besondere Anweisungen..."
            rows={3}
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
    </div>
  );
}
