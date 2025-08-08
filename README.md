# TI-Flow POC - Pharmacy Application

A proof-of-concept pharmacy web application with backend service demonstrating e-prescription functionality and FHIR operations.

## Architecture

- **Frontend**: React + TypeScript pharmacy application
- **Backend**: Node.js/Express service for FHIR operations
- **Data**: Static FHIR CodeSystem serving

## Features

### Frontend Application
- **Patient Information Display**: Shows comprehensive patient data including personal information and insurance details
- **E-Prescription Loading**: Simulates loading e-prescriptions from the TI infrastructure
- **Prescription Management**: Displays prescription details including medication, dosage, and doctor information
- **Flow Operations**: Each prescription shows available operations based on its composition type (e.g., e16A)
- **Interactive Dropdowns**: Click the ⚙️ icon on prescriptions to see available operations like "Korrektur" and "Wiederausstellung"
- **FHIR Questionnaire Rendering**: Dynamic form generation from FHIR Questionnaire resources
- **Smart Auto-Population**: Automatically fills form fields from pharmacy system (AVS) and prescription data
- **Field Hints**: Visual indicators showing data source (e.g., "aus AVS geladen", "aus E-Rezept")
- **Modern UI**: Clean, responsive interface optimized for pharmacy workflows

### Backend Service (ti-flow-service)
- **FHIR CodeSystem API**: Serves static FHIR CodeSystem via `GET /$flow-operations`
- **Populate Endpoint**: Receives prescription data via `POST /$populate` for flow operations
- **Health Monitoring**: Health check endpoint for service status
- **CORS Support**: Configured for frontend integration

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite 7
- **Backend**: Node.js with Express
- **API**: RESTful endpoints with FHIR compliance
- **Styling**: CSS3 with modern grid and flexbox layouts

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation & Running

1. **Frontend Application**:
```bash
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev
```

2. **Backend Service**:
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start backend service (port 3001)
npm run dev
```

### Development URLs

- **Frontend**: http://localhost:5173/
- **Backend Health**: http://localhost:3001/health
- **FHIR Endpoint**: http://localhost:3001/$flow-operations

## Features Detail

### 📋 Available Operations for e16A:

- **Korrektur eines Muster 16**: For prescription corrections
- **Wiederausstellung eines Muster 16**: For prescription reissuance

### 🔧 Auto-Population Features:

The system automatically populates form fields with data from different sources:

- **Telematik-ID**: From pharmacy AVS system ("aus AVS geladen")
- **Requester Name**: From pharmacy system ("aus Apothekensystem") 
- **Prescription ID**: From e-prescription data ("aus E-Rezept")
- **Patient Name**: Derived from prescription context

Auto-populated fields are:
- Visually distinguished with gray background
- Read-only to prevent accidental changes
- Marked with informative hints about data source

## API Endpoints

### GET /$flow-operations
Returns a static FHIR CodeSystem JSON file containing flow operations.

**Response Content-Type**: `application/fhir+json`

### GET /health
Health check endpoint for service monitoring.

## Customization

To add your own FHIR CodeSystem data, replace the content in `backend/data/CodeSystem-flow-operation-forms-cs.json` with your actual FHIR CodeSystem resource.

The system expects a FHIR CodeSystem with nested concepts where:
- Top-level concepts represent composition types (e.g., "e16A", "e16D")
- Nested concepts represent available operations for that type (e.g., "e16A_korrektur", "e16A_wiederverordnung")

### Usage

1. Open the application in your browser
2. Click "E-Rezepte abrufen" to load mock prescription data
3. View patient information and prescription details
4. The interface demonstrates basic pharmacy workflow functionality

## Project Structure

```
src/
├── components/
│   ├── PatientInfo.tsx      # Patient information component
│   └── PrescriptionList.tsx # Prescription display component
├── types.ts                 # TypeScript type definitions
├── mockData.ts             # Mock data for demonstration
├── App.tsx                 # Main application component
└── App.css                 # Application styles
```

## Demo Data

The application includes mock data for:
- Patient: Maria Mustermann with complete personal and insurance information
- Prescriptions: 3 sample e-prescriptions with different medications and statuses

## Future Enhancements

- Integration with actual TI infrastructure
- Real-time prescription status updates
- Advanced prescription filtering and search
- Print functionality for prescriptions
- Inventory management integration

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
