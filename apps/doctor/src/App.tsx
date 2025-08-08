import { useState } from 'react';
import './App.css';
import { PatientList } from './components/PatientList';
import { PrescriptionForm } from './components/PrescriptionForm';
import { RequestsList } from './components/RequestsList';

export default function App() {
  const [refreshRequests, setRefreshRequests] = useState(0);

  const handleRequestSubmitted = () => {
    setRefreshRequests(prev => prev + 1);
  };

  return (
    <div className="doctor-app">
      <header className="app-header">
        <h1>🩺 TI-Flow Arztpraxis</h1>
        <p>Verschreibungs- und Anfragenverwaltungssystem</p>
      </header>

      <main className="main-content">
        <div className="content-section">
          <PatientList />
          <PrescriptionForm onPrescriptionCreated={handleRequestSubmitted} />
        </div>
        
        <div className="content-section">
          <RequestsList key={refreshRequests} />
        </div>
      </main>
    </div>
  );
}
