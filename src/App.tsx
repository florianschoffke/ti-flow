import { useState, useEffect } from 'react'
import type { Patient, Prescription, CodeSystem, CodeSystemConcept } from './types'
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
  const [codeSystem, setCodeSystem] = useState<CodeSystem | null>(null)
  const [availableOperations, setAvailableOperations] = useState<CodeSystemConcept[]>([])
  const [requestCodeSystem, setRequestCodeSystem] = useState<CodeSystem | null>(null)
  const [availableRequests, setAvailableRequests] = useState<CodeSystemConcept[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [codeSystemError, setCodeSystemError] = useState<string | null>(null)
  const [requestSubmittedTrigger, setRequestSubmittedTrigger] = useState(0)

  // Load CodeSystem on component mount
  useEffect(() => {
    const loadCodeSystems = async () => {
      try {
        // Load flow operations CodeSystem
        const cs = await TiFlowService.getCodeSystem()
        setCodeSystem(cs)
        setAvailableOperations(cs.concept || [])
        
        // Load request operations CodeSystem
        setIsLoadingRequests(true)
        const requestCs = await TiFlowService.getRequestOperations()
        setRequestCodeSystem(requestCs)
        setAvailableRequests(requestCs.concept || [])
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
          
          {codeSystem && (
            <div className="codesystem-info">
              📋 Geladenes CodeSystem: {codeSystem.title} (v{codeSystem.version})
            </div>
          )}
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
              availableOperations={availableOperations}
              onRequestSubmitted={handleRequestSubmitted}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
