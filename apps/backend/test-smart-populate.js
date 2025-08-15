#!/usr/bin/env node
/**
 * Test script for the smart SDC $populate endpoint
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample FHIR Bundle
const sampleBundle = {
  "resourceType": "Bundle",
  "id": "44420ed9-7388-4be5-acc5-9c124fad9f34",
  "identifier": [
    {
      "system": "https://gematik.de/fhir/erp/NamingSystem/GEM_ERP_NS_PrescriptionId",
      "value": "160.100.000.000.006.24"
    }
  ],
  "type": "document",
  "timestamp": "2024-05-20T08:30:00Z",
  "entry": [
    {
      "fullUrl": "urn:uuid:93866fdc-3e50-4902-a7e9-891b54737b5e",
      "resource": {
        "resourceType": "Patient",
        "id": "93866fdc-3e50-4902-a7e9-891b54737b5e",
        "identifier": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://fhir.de/CodeSystem/identifier-type-de-basis",
                  "code": "KVZ10"
                }
              ]
            },
            "system": "http://fhir.de/sid/gkv/kvid-10",
            "value": "K220635158"
          }
        ],
        "name": [
          {
            "use": "official",
            "family": "Königsstein",
            "given": ["Ludger"]
          }
        ],
        "birthDate": "1935-06-22"
      }
    },
    {
      "fullUrl": "urn:uuid:bc329f24-3d65-4286-bf06-b54dd6cad655",
      "resource": {
        "resourceType": "Practitioner",
        "id": "bc329f24-3d65-4286-bf06-b54dd6cad655",
        "identifier": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "LANR"
                }
              ]
            },
            "system": "https://fhir.kbv.de/NamingSystem/KBV_NS_Base_ANR",
            "value": "123456628"
          }
        ],
        "name": [
          {
            "use": "official",
            "family": "Freiherr von Müller",
            "given": ["Paul"],
            "prefix": ["Dr. med."]
          }
        ]
      }
    },
    {
      "fullUrl": "urn:uuid:5d3f4ac0-2b44-4d48-b363-e63efa72973b",
      "resource": {
        "resourceType": "Organization",
        "id": "5d3f4ac0-2b44-4d48-b363-e63efa72973b",
        "name": "MVZ"
      }
    },
    {
      "fullUrl": "urn:uuid:47076fb4-dc5c-4f75-85f6-b200033b3280",
      "resource": {
        "resourceType": "Medication",
        "id": "47076fb4-dc5c-4f75-85f6-b200033b3280",
        "code": {
          "coding": [
            {
              "system": "http://fhir.de/CodeSystem/ifa/pzn",
              "code": "00814665"
            }
          ],
          "text": "Januvia® 50 mg 28 Filmtabletten N1"
        }
      }
    },
    {
      "fullUrl": "urn:uuid:000abe24-f690-481e-9a9f-1cd0eb434e2f",
      "resource": {
        "resourceType": "MedicationRequest",
        "id": "000abe24-f690-481e-9a9f-1cd0eb434e2f",
        "authoredOn": "2024-05-20"
      }
    }
  ]
};

// Create the FHIR Parameters for the smart $populate operation
const populateParameters = {
  "resourceType": "Parameters",
  "id": "SmartPopulateTest",
  "meta": {
    "profile": [
      "http://hl7.org/fhir/uv/sdc/StructureDefinition/parameters"
    ]
  },
  "parameter": [
    {
      "name": "context",
      "part": [
        {
          "name": "name",
          "valueString": "e16A"
        },
        {
          "name": "content",
          "resource": sampleBundle
        }
      ]
    }
  ]
};

// Test the smart populate endpoint
async function testSmartPopulate() {
  console.log('🧠 Testing SMART SDC $populate endpoint...\n');
  
  // Test with the correct questionnaire ID from the file
  console.log('🎯 Testing with questionnaire ID: e16A-korrektur');
  try {
    const response = await fetch('http://localhost:3001/Questionnaire/e16A-korrektur/$populate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(populateParameters)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return;
    }

    const result = await response.json();
    console.log('✅ Smart populate successful!');
    console.log('📦 Response type:', result.resourceType);
    
    if (result.resourceType === 'Parameters') {
      console.log('🎯 Returned in Parameters format as expected!');
      const responseParam = result.parameter?.find(p => p.name === 'response');
      
      if (responseParam && responseParam.resource) {
        const questionnaireResponse = responseParam.resource;
        console.log('📋 QuestionnaireResponse ID:', questionnaireResponse.id);
        console.log('📊 Status:', questionnaireResponse.status);
        console.log('📝 Number of populated items:', questionnaireResponse.item?.length || 0);
        
        // Show first few populated items
        if (questionnaireResponse.item && questionnaireResponse.item.length > 0) {
          console.log('\n🔍 Sample populated data:');
          for (let i = 0; i < Math.min(3, questionnaireResponse.item.length); i++) {
            const item = questionnaireResponse.item[i];
            const value = item.answer?.[0]?.valueString || item.answer?.[0]?.valueDate || '(no answer)';
            console.log(`   - ${item.text}: ${value}`);
          }
          
          if (questionnaireResponse.item.length > 3) {
            console.log(`   ... and ${questionnaireResponse.item.length - 3} more items`);
          }
        }
      }
    } else {
      console.log('⚠️ Response not in Parameters format');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Smart populate test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test with a non-existent questionnaire ID
  console.log('🚫 Testing with non-existent questionnaire ID: non-existent-id');
  try {
    const response = await fetch('http://localhost:3001/Questionnaire/non-existent-id/$populate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(populateParameters)
    });

    const result = await response.json();
    if (response.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent questionnaire');
      console.log('📄 Error message:', result.message);
    } else {
      console.log('⚠️ Unexpected response:', response.status, result);
    }
    
  } catch (error) {
    console.error('❌ Error testing non-existent ID:', error.message);
  }
}

// Run the test
testSmartPopulate();
