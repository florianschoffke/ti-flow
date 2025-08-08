# TI-Flow Healthcare Systems

A comprehensive healthcare workflow system consisting of three integrated applications:

- 🏥 **Doctor System** - Prescription management and patient care
- 💊 **Pharmacy System** - Prescription processing and inventory management  
- 🔧 **Backend Service** - FHIR-compliant API and data management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+

### Installation

```bash
# Install dependencies for all applications
npm run install:all
```

### Development

Run all services simultaneously:
```bash
npm run dev
```

This will start:
- **Backend Service**: http://localhost:3001 
- **Pharmacy System**: http://localhost:5173
- **Doctor System**: http://localhost:5174

### Individual Services

Run services individually:

```bash
# Backend only
npm run dev:backend

# Pharmacy system only  
npm run dev:pharmacy

# Doctor system only
npm run dev:doctor
```

## 📁 Project Structure

```
ti-flow/
├── apps/
│   ├── backend/          # FHIR-compliant API service
│   │   ├── server.js     # Express server
│   │   ├── data/         # FHIR resources and templates
│   │   └── package.json
│   ├── pharmacy/         # Pharmacy management system
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── types.ts
│   │   └── package.json
│   └── doctor/           # Doctor practice system
│       ├── src/
│       │   ├── components/
│       │   ├── services/
│       │   └── App.tsx
│       └── package.json
├── package.json          # Root package with unified scripts
└── README.md
```

## 🏥 Doctor System

The doctor system provides:

### Features
- **Patient Management** - View and manage patient records
- **Prescription Creation** - Create and manage e-prescriptions
- **Request Handling** - Review and respond to pharmacy requests
- **FHIR Integration** - Compliant with healthcare standards

### Key Components
- `PatientList` - Patient directory and selection
- `PrescriptionForm` - E-prescription creation interface
- `RequestsList` - Pharmacy request management

### Access
- **URL**: http://localhost:5174
- **Port**: 5174

## 💊 Pharmacy System  

The pharmacy system provides:

### Features
- **Prescription Processing** - Handle incoming e-prescriptions
- **Request Management** - Submit requests to doctors
- **Inventory Tracking** - Monitor medication availability
- **FHIR Compliance** - Standards-based healthcare workflows

### Key Components
- `PrescriptionList` - View and process prescriptions
- `RequestOperations` - Submit various request types
- `ActiveRequestsList` - Track submitted requests
- `QuestionnaireRenderer` - FHIR questionnaire handling

### Access
- **URL**: http://localhost:5173  
- **Port**: 5173

## 🔧 Backend Service

The backend provides FHIR-compliant APIs:

### Features
- **FHIR R4 Compliance** - Standard healthcare data exchange
- **Request Processing** - Handle pharmacy and doctor workflows
- **Data Persistence** - In-memory storage with extensible architecture
- **Cross-Origin Support** - CORS enabled for web applications

### Key Endpoints
- `GET /$request-operations` - Available request operations
- `POST /$populate` - Populate questionnaires with data
- `POST /$flow-request` - Submit workflow requests
- `GET /$active-requests` - List active requests
- `GET /$active-requests/:id` - Get request details

### Access
- **URL**: http://localhost:3001
- **Port**: 3001

## 🛠️ Development

### Building

```bash
# Build all applications
npm run build

# Build specific application
npm run build:pharmacy
npm run build:doctor
```

### Production

```bash
# Start all services in production mode
npm start
```

### Cleaning

```bash
# Clean all node_modules and build artifacts
npm run clean
```

## 🔧 Configuration

Each application can be configured independently:

### Ports
- Backend: 3001
- Pharmacy: 5173  
- Doctor: 5174

### Environment Variables
- `BACKEND_URL` - Backend service URL (default: http://localhost:3001)
- `NODE_ENV` - Environment mode (development/production)

## 🏗️ Architecture

### Communication Flow
```
Doctor System ←→ Backend Service ←→ Pharmacy System
```

### Data Standards
- **FHIR R4** - Healthcare data exchange standard
- **REST APIs** - RESTful service architecture
- **TypeScript** - Type-safe development
- **React** - Modern web application framework

## 📝 API Documentation

### Backend Endpoints

#### Request Operations
```http
GET /request-operations
```
Returns available FHIR request operations.

#### Populate Questionnaire  
```http
POST /populate
Content-Type: application/json

{
  "requestCode": "rezeptanforderung",
  "prescription": { ... }
}
```

#### Submit Request
```http
POST /flow-request  
Content-Type: application/json

{
  "questionnaire": { ... },
  "questionnaireResponse": { ... }
}
```

#### List Active Requests
```http
GET /active-requests
```

#### Get Request Details
```http
GET /active-requests/:id
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`  
5. **Open Pull Request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in each app's README
- Review the FHIR R4 specification for data standards

---

**TI-Flow** - Streamlining Healthcare Workflows
