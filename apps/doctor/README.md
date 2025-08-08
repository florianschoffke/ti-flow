# TI-Flow Doctor System

A comprehensive doctor practice management system for creating prescriptions and handling pharmacy requests.

## Features

- 👥 **Patient Management** - View and manage patient records
- 📝 **E-Prescription Creation** - Create and manage electronic prescriptions
- 📋 **Request Handling** - Review and respond to pharmacy requests
- 🏥 **Practice Integration** - Streamlined workflow for medical practices
- 📱 **Modern Interface** - Clean, professional design

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

The application will be available at http://localhost:5174

### Building

```bash
npm run build
```

## Usage

### Patient Management
1. **View Patients** - Browse patient directory
2. **Select Patient** - Click on patient to view details
3. **Patient Information** - See comprehensive patient data

### Prescription Creation
1. **Select Patient** - Choose patient from dropdown
2. **Enter Medication** - Specify medication details
3. **Set Dosage** - Define dosage and frequency
4. **Add Notes** - Include special instructions
5. **Create Prescription** - Generate e-prescription

### Request Management
1. **View Requests** - See incoming pharmacy requests
2. **Review Details** - Check request information
3. **Approve/Reject** - Make decisions on requests
4. **Track Status** - Monitor request progress

## Components

### Core Components
- `PatientList` - Patient directory and management
- `PrescriptionForm` - E-prescription creation interface
- `RequestsList` - Pharmacy request handling

### Features
- **Real-time Updates** - Live request status updates
- **Form Validation** - Comprehensive input validation
- **Error Handling** - Robust error management
- **Responsive Design** - Works on all devices

## Patient Data

The system includes sample patients:
- Anna Müller (A123456789)
- Hans Schmidt (B987654321)
- Maria Weber (C456789123)

## Request Types

Handles various pharmacy requests:
- **Rezeptanforderung** - Prescription requests
- **Dosierungsanfrage** - Dosage inquiries
- **Substitutionsanfrage** - Substitution requests

## API Integration

Integrates with backend for:
- Patient data management
- Prescription creation
- Request processing
- Status tracking

## Configuration

Default backend URL: `http://localhost:3001`

To customize configuration, update the service files in `src/services/`.

## Tech Stack

- **React 19** - Modern React framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **CSS3** - Modern styling
- **ESLint** - Code quality

## Development Notes

### Adding New Features
1. Create components in `src/components/`
2. Add services in `src/services/`
3. Update types in appropriate files
4. Test thoroughly

### Styling Guidelines
- Use CSS custom properties for colors
- Follow responsive design principles
- Maintain consistent spacing
- Use semantic HTML elements

## Contributing

1. Follow TypeScript best practices
2. Write comprehensive tests
3. Document new features
4. Maintain code quality

## License

MIT License
