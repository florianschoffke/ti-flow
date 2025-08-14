import { useState, useEffect } from 'react'
import type { Prescription, CodeSystemConcept } from './types'
import { mockPrescriptions } from './mockData'
import { PrescriptionList } from './components/PrescriptionList'
import { TaskList } from './components/TaskList'
import { TiFlowService } from './services/tiFlowService'
import './App.css'

function App() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [availableDocumentOperations, setAvailableDocumentOperations] = useState<CodeSystemConcept[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [codeSystemError, setCodeSystemError] = useState<string | null>(null)

  // Load prescriptions and CodeSystem on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Load document operations CodeSystem  
        const documentCs = await TiFlowService.getDocumentOperations()
        setAvailableDocumentOperations(documentCs.concepts || [])
        
        // Load prescriptions automatically
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call delay
        setPrescriptions(mockPrescriptions)
        
        setIsLoading(false)
        setCodeSystemError(null)
      } catch (error) {
        console.error('Failed to load data:', error)
        setCodeSystemError('Failed to load operations from backend')
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleRequestSubmitted = () => {
    // Handle request submission if needed
    console.log('Request submitted')
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
        {isLoading ? (
          <div className="loading-section">
            <p>Lädt E-Rezepte...</p>
          </div>
        ) : (
          <div className="content-section">
            <TaskList />
            <PrescriptionList 
              prescriptions={prescriptions} 
              availableOperations={availableDocumentOperations}
              onRequestSubmitted={handleRequestSubmitted}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
