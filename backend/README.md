# TI-Flow Service

Backend service for the TI-Flow POC pharmacy application.

## Features

- RESTful API for FHIR operations
- Static FHIR CodeSystem serving
- CORS enabled for frontend integration
- Health check endpoint

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
