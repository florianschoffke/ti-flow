import { useState, useEffect } from 'react';
import { PatientService, type Patient } from '../services/patientService';

export function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    // Load mock patients from service
    setPatients(PatientService.getMockPatients());
  }, []);

  return (
    <div className="card">
      <h3>👥 Patienten</h3>
      
      {patients.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
          Keine Patienten gefunden.
        </p>
      ) : (
        <div>
          {patients.map((patient) => (
            <div 
              key={patient.id} 
              className={`list-item ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
              onClick={() => setSelectedPatient(selectedPatient?.id === patient.id ? null : patient)}
              style={{ cursor: 'pointer' }}
            >
              <h4>{patient.name}</h4>
              <p><strong>Geburtsdatum:</strong> {new Date(patient.birthDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Versichertennummer:</strong> {patient.insuranceNumber}</p>
              {selectedPatient?.id === patient.id && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
                  <p><strong>Adresse:</strong> {patient.address}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
