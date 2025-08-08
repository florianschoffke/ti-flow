# TI-Flow Pharmacy System

A modern pharmacy management system for processing e-prescriptions and managing healthcare workflows.

## Features

- 💊 **E-Prescription Processing** - Handle incoming electronic prescriptions
- 📋 **Request Management** - Submit various types of requests to doctors
- 📊 **Active Request Tracking** - Monitor submitted requests and their status
- 🔄 **FHIR Compliance** - Standards-based healthcare data exchange
- 📱 **Responsive Design** - Modern, mobile-friendly interface

## Getting Started

### Prerequisites
- Node.js 18+
- npm 8+
- Backend service running on port 3001

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at http://localhost:5173

### Building

```bash
npm run build
```

## Usage

1. **Load Prescriptions**: Click "E-Rezepte laden" to load sample prescriptions
2. **View Prescription Details**: Click on prescriptions to see medication details
3. **Submit Requests**: Use the "Anforderungen" dropdown to submit requests to doctors
4. **Fill Questionnaires**: Complete FHIR-compliant forms with required information
5. **Track Requests**: Monitor submitted requests in "Laufende Anfragen" section
6. **View Details**: Click "Anfrage anzeigen" to review submitted questionnaires

## Components

### Core Components
- `PrescriptionList` - Display and manage e-prescriptions
- `RequestOperations` - Handle various request operations
- `ActiveRequestsList` - Track and view submitted requests
- `QuestionnaireRenderer` - FHIR questionnaire form rendering
- `FlowOperationsDropdown` - Operation selection interface

### Services
- `TiFlowService` - API communication with backend
- `PrescriptionService` - Prescription data management

## API Integration

The pharmacy system integrates with the backend service via:

- `GET /prescriptions` - Load prescription data
- `GET /$request-operations` - Get available request operations
- `GET /$document-operations` - Get available document operations
- `POST /$flow-request` - Submit requests
- `GET /$active-requests` - List active requests

## Configuration

Default backend URL: `http://localhost:3001`

To change the backend URL, update the service configuration in `src/services/tiFlowService.ts`.

## Tech Stack

- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **FHIR R4** - Healthcare data standards
- **ESLint** - Code quality assurance

## Contributing

1. Follow the established TypeScript patterns
2. Maintain FHIR R4 compliance
3. Add unit tests for new components
4. Update documentation for new features

## License

MIT License
