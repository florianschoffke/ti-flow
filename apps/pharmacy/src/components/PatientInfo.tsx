import type { Patient } from '../types';

interface PatientInfoProps {
  patient: Patient | null;
}

export function PatientInfo({ patient }: PatientInfoProps) {
  if (!patient) {
    return (
      <div className="patient-info">
        <h2>Patientendaten</h2>
        <p>Keine Patientendaten geladen</p>
      </div>
    );
  }

  return (
    <div className="patient-info">
      <h2>Patientendaten</h2>
      <div className="patient-details">
        <div className="patient-row">
          <span className="label">Name:</span>
          <span className="value">{patient.firstName} {patient.lastName}</span>
        </div>
        <div className="patient-row">
          <span className="label">Geburtsdatum:</span>
          <span className="value">{patient.dateOfBirth}</span>
        </div>
        <div className="patient-row">
          <span className="label">Adresse:</span>
          <span className="value">{patient.address}</span>
        </div>
        <div className="patient-row">
          <span className="label">Versichertennummer:</span>
          <span className="value">{patient.insuranceNumber}</span>
        </div>
      </div>
    </div>
  );
}
