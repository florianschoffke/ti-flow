import { useState, useEffect } from 'react';

interface Patient {
  id: string;
  name: string;
  birthDate: string;
  insuranceNumber: string;
  address: string;
}

export function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    // Mock patient data
    setPatients([
      {
        id: 'pat-001',
        name: 'Anna Müller',
        birthDate: '1985-03-15',
        insuranceNumber: 'A123456789',
        address: 'Musterstraße 123, 12345 Berlin'
      },
      {
        id: 'pat-004',
        name: 'Ludger Königsstein',
        birthDate: '1985-03-15',
        insuranceNumber: 'K220635158',
        address: 'Holzweg 123, 12345 Berlin'
      },
      {
        id: 'pat-002',
        name: 'Hans Schmidt',
        birthDate: '1975-08-22',
        insuranceNumber: 'B987654321',
        address: 'Beispielweg 456, 54321 Hamburg'
      },
      {
        id: 'pat-003',
        name: 'Maria Weber',
        birthDate: '1990-12-05',
        insuranceNumber: 'C456789123',
        address: 'Testplatz 789, 98765 München'
      }
    ]);
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
