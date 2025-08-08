import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for tracking requests (in production, use a database)
const activeRequests = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ti-flow-service',
    timestamp: new Date().toISOString()
  });
});

// Flow operations endpoint - serves static FHIR CodeSystem
app.get('/\\$flow-operations', (req, res) => {
  try {
    // Read the static FHIR CodeSystem JSON file
    const filePath = join(__dirname, 'data', 'CodeSystem-flow-operation-forms-cs.json');
    const data = readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(jsonData);
  } catch (error) {
    console.error('Error reading flow-operations.json:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Could not read flow operations data'
    });
  }
});

// Request operations endpoint - serves static FHIR CodeSystem for requests
app.get('/\\$request-operations', (req, res) => {
  try {
    // Read the static FHIR CodeSystem JSON file for requests
    const filePath = join(__dirname, 'data', 'CodeSystem-flow-requests-cs.json');
    const data = readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    res.setHeader('Content-Type', 'application/fhir+json');
    res.json(jsonData);
  } catch (error) {
    console.error('Error reading flow-requests.json:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Could not read flow requests data'
    });
  }
});

// Populate endpoint - receives prescription data for processing
app.post('/\\$populate', (req, res) => {
  try {
    console.log('📋 Received populate request:', req.body);
    
    const { prescription, operationCode, requestCode, pharmacyData } = req.body;
    
    // Handle either prescription operations or request operations
    const code = operationCode || requestCode;
    
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'operationCode or requestCode is required'
      });
    }
    
    // Look for the form file based on the code
    const formFileName = `${code}-form.json`;
    const formFilePath = join(__dirname, 'data', formFileName);
    
    try {
      // Read the questionnaire form
      const formData = readFileSync(formFilePath, 'utf8');
      const questionnaire = JSON.parse(formData);
      
      // Create a FHIR Parameters response
      const response = {
        resourceType: "Parameters",
        parameter: [
          {
            name: "questionnaire",
            resource: questionnaire
          }
        ]
      };
      
      // Add prescription data if this is a prescription operation
      if (prescription) {
        response.parameter.push({
          name: "prescription",
          resource: prescription
        });
      }
      
      // Add pharmacy data if this is a request operation
      if (pharmacyData) {
        response.parameter.push({
          name: "pharmacyData",
          resource: pharmacyData
        });
      }
      
      response.parameter.push({
        name: operationCode ? "operationCode" : "requestCode",
        valueString: code
      });
      
      res.setHeader('Content-Type', 'application/fhir+json');
      res.json(response);
      
    } catch (formError) {
      console.error(`Form file not found: ${formFileName}`, formError);
      res.status(404).json({
        error: 'Form not found',
        message: `No form found for code: ${code}`
      });
    }
    
  } catch (error) {
    console.error('Error processing populate request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not process populate request'
    });
  }
});

// Flow request endpoint - receives completed questionnaire responses
app.post('/\\$flow-request', (req, res) => {
  try {
    console.log('📝 Received flow request:', req.body);
    
    const timestamp = new Date().toISOString();
    const requestId = `req_${Date.now()}`;
    const questionnaireResponse = req.body;
    
    // Determine request type and kind
    let requestKind = 'Unknown';
    let operationType = 'request';
    
    if (questionnaireResponse.questionnaire) {
      if (questionnaireResponse.questionnaire.includes('Korrektur')) {
        requestKind = 'E-Rezept Korrektur';
        operationType = 'correction';
      } else if (questionnaireResponse.questionnaire.includes('Rezeptanforderung')) {
        requestKind = 'Rezeptanforderung';
        operationType = 'prescription_request';
      } else if (questionnaireResponse.questionnaire.includes('Zytostatika')) {
        requestKind = 'Zytostatika Anfrage';
        operationType = 'cytostatic_request';
      } else if (questionnaireResponse.questionnaire.includes('BTM')) {
        requestKind = 'BTM Notfall';
        operationType = 'btm_emergency';
      }
    }
    
    // Store the request
    const requestData = {
      id: requestId,
      kind: requestKind,
      type: operationType,
      status: 'submitted',
      requestDate: timestamp,
      questionnaireResponse: questionnaireResponse,
      lastUpdated: timestamp
    };
    
    activeRequests.set(requestId, requestData);
    
    console.log(`💾 Stored flow request ${requestId}: ${requestKind}`);
    
    res.status(201).json({
      status: 'created',
      requestId: requestId,
      requestKind: requestKind,
      message: 'Flow request submitted successfully',
      timestamp: timestamp
    });
    
  } catch (error) {
    console.error('Error processing flow request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not process flow request'
    });
  }
});

// Get active requests endpoint
app.get('/\\$active-requests', (req, res) => {
  try {
    const requests = Array.from(activeRequests.values())
      .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    console.log(`📋 Returning ${requests.length} active requests`);
    
    res.json({
      total: requests.length,
      requests: requests.map(req => ({
        id: req.id,
        kind: req.kind,
        type: req.type,
        status: req.status,
        requestDate: req.requestDate,
        lastUpdated: req.lastUpdated
      }))
    });
    
  } catch (error) {
    console.error('Error retrieving active requests:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve active requests'
    });
  }
});

// Get specific request details
app.get('/\\$active-requests/:requestId', (req, res) => {
  try {
    const requestId = req.params.requestId;
    const requestData = activeRequests.get(requestId);
    
    if (!requestData) {
      return res.status(404).json({
        error: 'Request not found',
        message: `No request found with ID: ${requestId}`
      });
    }
    
    console.log(`📋 Returning request details for ${requestId}`);
    
    res.json(requestData);
    
  } catch (error) {
    console.error('Error retrieving request details:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve request details'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TI-Flow Service running on http://localhost:${PORT}`);
  console.log(`📋 Flow Operations endpoint: http://localhost:${PORT}/$flow-operations`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

export default app;
