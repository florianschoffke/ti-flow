import { useState } from 'react';
import './App.css';
import { RequestsList } from './components/RequestsList';
import { DoctorInfoService } from './services/doctorInfoService';

export default function App() {
  const [refreshRequests, setRefreshRequests] = useState(0);

  const handleRequestSubmitted = () => {
    setRefreshRequests(prev => prev + 1);
  };

  const doctorInfo = DoctorInfoService.getDoctorInfo();

  return (
    <div className="doctor-app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-main">
            <h1>🩺 TI-Flow Arztpraxis</h1>
            <p>Verschreibungs- und Anfragenverwaltungssystem</p>
          </div>
          <div className="doctor-info">
            <h3>{doctorInfo.practitioner.name.fullName}</h3>
            <p>{doctorInfo.practitioner.qualification}</p>
            <p>{doctorInfo.organization.name} • {DoctorInfoService.getFormattedAddress()}</p>
            <small>Telematik-ID: {doctorInfo.practitioner.telematikId}</small>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-section">
          <RequestsList key={refreshRequests} onPrescriptionCreated={handleRequestSubmitted} />
        </div>
      </main>
    </div>
  );
}
