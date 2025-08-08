# TI-Flow Backend Service

A FHIR R4-compliant backend service providing healthcare workflow APIs for pharmacy and doctor systems.

## Features

- 🔌 **FHIR R4 Compliance** - Standards-based healthcare data exchange
- 📊 **Request Processing** - Handle pharmacy and doctor workflows
- 💾 **Data Management** - In-memory storage with extensible architecture
- 🌐 **CORS Support** - Cross-origin support for web applications
- 🔄 **Real-time Updates** - Live request tracking and status updates

## Endpoints

### GET /$flow-operations
Returns a static FHIR CodeSystem JSON file containing flow operations.

**Response**: `application/fhir+json`

### GET /health
Health check endpoint for service monitoring.

**Response**: 
```json
{
  "status": "healthy",
  "service": "ti-flow-service", 
  "timestamp": "2025-08-08T..."
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. For development with auto-reload:
```bash
npm run dev
```

The service will run on `http://localhost:3001`

## Configuration

- **Port**: Set via `PORT` environment variable (default: 3001)
- **FHIR Data**: Place your FHIR CodeSystem in `data/CodeSystem-flow-operation-forms-cs.json`

## Data Structure

The `data/CodeSystem-flow-operation-forms-cs.json` file should contain a valid FHIR CodeSystem resource with nested concepts for composition types and their available operations.
