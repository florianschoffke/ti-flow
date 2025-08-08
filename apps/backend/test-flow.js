/**
 * Test script for Flow Service endpoints
 * This script demonstrates the complete flow based on the state diagram
 */

const BASE_URL = 'http://localhost:3001';

// Test data
const testRequest = {
  requester: 'pharmacy-001',
  receiver: 'doctor-001',
  questionnaire: {
    title: 'Test Prescription Request',
    description: 'Request for prescription clarification',
    items: [
      {
        linkId: 'patient-name',
        text: 'Patient Name',
        type: 'string',
        required: true
      },
      {
        linkId: 'medication',
        text: 'Medication',
        type: 'string',
        required: true
      },
      {
        linkId: 'dosage',
        text: 'Dosage',
        type: 'string',
        required: true
      }
    ]
  }
};

const testCounterOffer = {
  questionnaire: {
    title: 'Counter-offer for Prescription Request',
    description: 'Modified prescription details',
    items: [
      {
        linkId: 'patient-name',
        text: 'Patient Name',
        type: 'string',
        required: true,
        initial: [{ valueString: 'John Doe' }]
      },
      {
        linkId: 'medication',
        text: 'Medication',
        type: 'string',
        required: true,
        initial: [{ valueString: 'Modified Medication' }]
      },
      {
        linkId: 'dosage',
        text: 'Dosage',
        type: 'string',
        required: true,
        initial: [{ valueString: '2x daily' }]
      }
    ]
  }
};

// Helper function to make HTTP requests
async function makeRequest(method, path, data = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    console.error(`Error making ${method} request to ${path}:`, error);
    return { status: 500, data: { error: error.message } };
  }
}

// Test the complete flow
async function testFlowService() {
  console.log('🧪 Testing TI-Flow Service Endpoints');
  console.log('=====================================\n');

  let taskId;
  let questionnaireId;

  try {
    // 1. Create new request (POST /$request)
    console.log('1. Creating new flow request...');
    const createResult = await makeRequest('POST', '/$request', testRequest);
    
    if (createResult.status === 201) {
      taskId = createResult.data.taskId;
      questionnaireId = createResult.data.questionnaireId;
      console.log('✅ Request created successfully');
      console.log(`   Task ID: ${taskId}`);
      console.log(`   Questionnaire ID: ${questionnaireId}`);
      console.log(`   Status: ${createResult.data.task.businessStatus.text}\n`);
    } else {
      console.log('❌ Failed to create request:', createResult.data);
      return;
    }

    // 2. Get task status (GET /Task/:id) - as receiver to mark as received
    console.log('2. Getting task status (as receiver)...');
    const getTaskResult = await makeRequest('GET', `/Task/${taskId}`, null, {
      'x-actor-id': 'doctor-001'
    });
    
    if (getTaskResult.status === 200) {
      console.log('✅ Task retrieved successfully');
      console.log(`   Status: ${getTaskResult.data.businessStatus.text}`);
      console.log(`   Owner: ${getTaskResult.data.owner.reference}\n`);
    } else {
      console.log('❌ Failed to get task:', getTaskResult.data);
    }

    // 3. Get questionnaire (GET /Questionnaire/:id)
    console.log('3. Getting questionnaire...');
    const getQuestionnaireResult = await makeRequest('GET', `/Questionnaire/${questionnaireId}`);
    
    if (getQuestionnaireResult.status === 200) {
      console.log('✅ Questionnaire retrieved successfully');
      console.log(`   Title: ${getQuestionnaireResult.data.title}`);
      console.log(`   Items: ${getQuestionnaireResult.data.items.length}\n`);
    } else {
      console.log('❌ Failed to get questionnaire:', getQuestionnaireResult.data);
    }

    // 4. Submit counter-offer (POST /:id/$counter-offer)
    console.log('4. Submitting counter-offer...');
    const counterOfferResult = await makeRequest('POST', `/${taskId}/$counter-offer`, testCounterOffer, {
      'x-actor-id': 'doctor-001'
    });
    
    if (counterOfferResult.status === 200) {
      console.log('✅ Counter-offer submitted successfully');
      console.log(`   Status: ${counterOfferResult.data.task.businessStatus.text}\n`);
    } else {
      console.log('❌ Failed to submit counter-offer:', counterOfferResult.data);
    }

    // 5. Accept the counter-offer (POST /:id/$accept)
    console.log('5. Accepting the task...');
    const acceptResult = await makeRequest('POST', `/${taskId}/$accept`, null, {
      'x-actor-id': 'pharmacy-001'
    });
    
    if (acceptResult.status === 200) {
      console.log('✅ Task accepted successfully');
      console.log(`   Status: ${acceptResult.data.task.businessStatus.text}\n`);
    } else {
      console.log('❌ Failed to accept task:', acceptResult.data);
    }

    // 6. Close the task (POST /:id/$close)
    console.log('6. Closing the task...');
    const closeData = {
      docId: 'prescription-123',
      docPw: 'secure-password-456'
    };
    
    const closeResult = await makeRequest('POST', `/${taskId}/$close`, closeData, {
      'x-actor-id': 'doctor-001'
    });
    
    if (closeResult.status === 200) {
      console.log('✅ Task completed successfully');
      console.log(`   Status: ${closeResult.data.task.businessStatus.text}\n`);
    } else {
      console.log('❌ Failed to close task:', closeResult.data);
    }

    // 7. Final status check
    console.log('7. Final status check...');
    const finalStatusResult = await makeRequest('GET', `/Task/${taskId}`);
    
    if (finalStatusResult.status === 200) {
      console.log('✅ Final status retrieved');
      console.log(`   Status: ${finalStatusResult.data.businessStatus.text}`);
      console.log(`   Last Modified: ${finalStatusResult.data.lastModified}\n`);
    }

    console.log('🎉 Flow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test rejection flow
async function testRejectionFlow() {
  console.log('\n🧪 Testing Rejection Flow');
  console.log('==========================\n');

  try {
    // Create another request
    console.log('1. Creating request for rejection test...');
    const createResult = await makeRequest('POST', '/$request', testRequest);
    
    if (createResult.status === 201) {
      const taskId = createResult.data.taskId;
      console.log(`✅ Request created (Task ID: ${taskId})\n`);

      // Mark as received
      await makeRequest('GET', `/Task/${taskId}`, null, { 'x-actor-id': 'doctor-001' });

      // Reject the task
      console.log('2. Rejecting the task...');
      const rejectResult = await makeRequest('POST', `/${taskId}/$reject`, null, {
        'x-actor-id': 'doctor-001'
      });
      
      if (rejectResult.status === 200) {
        console.log('✅ Task rejected successfully');
        console.log(`   Status: ${rejectResult.data.task.businessStatus.text}\n`);
      } else {
        console.log('❌ Failed to reject task:', rejectResult.data);
      }
    }
  } catch (error) {
    console.error('❌ Rejection test failed:', error);
  }
}

// Run the tests
async function runTests() {
  await testFlowService();
  await testRejectionFlow();
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ or fetch polyfill');
  console.log('💡 Try running: npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);
