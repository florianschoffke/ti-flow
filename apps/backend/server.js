import express from 'express';
import cors from 'cors';

// Import service modules
import { setupHealthService } from './modules/health-service.js';
import { setupInformationService } from './modules/information-service.js';
import { setupFlowService } from './modules/flow-service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Endpoint registry for dynamic documentation
const endpointRegistry = {
  'Health & Status': [],
  'Information Service': [],
  'Flow Service': []
};

// Helper function to register endpoints
function registerEndpoint(category, method, path, description) {
  if (!endpointRegistry[category]) {
    endpointRegistry[category] = [];
  }
  endpointRegistry[category].push({ method, path, description });
}

// Middleware
app.use(cors());
app.use(express.json());

// Setup service modules
console.log('🚀 Starting TI-Flow Service...');
console.log('📦 Loading service modules...');

try {
  // Load Health Service
  setupHealthService(app, registerEndpoint);
  
  // Load Information Service  
  setupInformationService(app, registerEndpoint);
  
  // Load Flow Service
  setupFlowService(app, registerEndpoint);

  console.log('✅ All service modules loaded successfully');
} catch (error) {
  console.error('❌ Error loading service modules:', error);
  process.exit(1);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  // Dynamically generate available endpoints list
  const availableEndpoints = [];
  Object.values(endpointRegistry).forEach(categoryEndpoints => {
    categoryEndpoints.forEach(endpoint => {
      availableEndpoints.push(endpoint.path);
    });
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.originalUrl} not found`,
    availableEndpoints
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 TI-Flow Service running on http://localhost:' + PORT);
  console.log('');
  console.log('📋 Available endpoints:');
  
  // Dynamically display endpoints
  Object.entries(endpointRegistry).forEach(([category, endpoints]) => {
    if (endpoints.length > 0) {
      console.log(`   ${category}:`);
      endpoints.forEach((endpoint, index) => {
        const isLast = index === endpoints.length - 1;
        const prefix = isLast ? '   └──' : '   ├──';
        console.log(`${prefix} ${endpoint.method}  ${endpoint.path}`);
      });
      console.log('');
    } else {
      console.log(`   ${category}:`);
      console.log('   └── (No endpoints - ready for implementation)');
      console.log('');
    }
  });
});

export default app;
