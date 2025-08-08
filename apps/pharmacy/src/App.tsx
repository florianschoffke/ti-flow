import { useState, useEffect } from 'react'
import type { Patient, Prescription, CodeSystemConcept } from './types'
import { mockPatient, mockPrescriptions } from './mockData'
import { PatientInfo } from './components/PatientInfo'
import { PrescriptionList } from './components/PrescriptionList'
import { RequestOperations } from './components/RequestOperations'
import { ActiveRequestsList } from './components/ActiveRequestsList'
import { TiFlowService } from './services/tiFlowService'
import './App.css'

function App() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [availableRequests, setAvailableRequests] = useState<CodeSystemConcept[]>([])
  const [availableDocumentOperations, setAvailableDocumentOperations] = useState<CodeSystemConcept[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [codeSystemError, setCodeSystemError] = useState<string | null>(null)
  const [requestSubmittedTrigger, setRequestSubmittedTrigger] = useState(0)

  // Load CodeSystem on component mount
  useEffect(() => {
    const loadCodeSystems = async () => {
      try {
        setIsLoadingRequests(true)
        
        // Load request operations CodeSystem
        const requestCs = await TiFlowService.getRequestOperations()
        setAvailableRequests(requestCs.concepts || [])
        
        // Load document operations CodeSystem  
        const documentCs = await TiFlowService.getDocumentOperations()
        setAvailableDocumentOperations(documentCs.concepts || [])
        
        setIsLoadingRequests(false)
        setCodeSystemError(null)
      } catch (error) {
        console.error('Failed to load CodeSystems:', error)
        setCodeSystemError('Failed to load operations from backend')
        setIsLoadingRequests(false)
      }
    }

    loadCodeSystems()
  }, [])

  const handleLoadPrescriptions = async () => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setPatient(mockPatient)
    setPrescriptions(mockPrescriptions)
    setIsLoading(false)
  }

  const handleRequestSubmitted = () => {
    // Trigger refresh of active requests list
    setRequestSubmittedTrigger(prev => prev + 1)
  }

  return (
    <div className="pharmacy-app">
      <header className="app-header">
        <h1>🏥 Apotheken-System</h1>
        <p>TI-Flow POC - E-Rezept Demonstration</p>
        {codeSystemError && (
          <div className="error-banner">
            ⚠️ {codeSystemError}
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="action-section">
          <div className="action-buttons">
            <button 
              className="load-prescriptions-btn"
              onClick={handleLoadPrescriptions}
              disabled={isLoading}
            >
              {isLoading ? 'Lädt...' : 'E-Rezepte abrufen'}
            </button>
            
            <RequestOperations 
              availableRequests={availableRequests}
              isLoading={isLoadingRequests}
              onRequestSubmitted={handleRequestSubmitted}
            />
          </div>
        </div>

        <div className="content-section">
          <div className="left-column">
            <PatientInfo patient={patient} />
            <ActiveRequestsList 
              key={requestSubmittedTrigger} 
              onRequestSubmitted={handleRequestSubmitted}
            />
          </div>
          <div className="right-column">
            <PrescriptionList 
              prescriptions={prescriptions} 
              availableOperations={availableDocumentOperations}
              onRequestSubmitted={handleRequestSubmitted}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
