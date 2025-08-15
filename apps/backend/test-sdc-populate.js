#!/usr/bin/env node
/**
 * Test script for the new SDC-compliant /Questionnaire/{id}/$populate endpoint
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample FHIR Bundle (same as before)
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

// Create the FHIR Parameters for the new SDC $populate operation
const populateParameters = {
  "resourceType": "Parameters",
  "id": "PopulateParametersExample",
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

// Test both endpoints
async function testBothEndpoints() {
  console.log('🧪 Testing both $populate endpoints...\n');
  
  // Test new SDC-compliant endpoint
  console.log('1️⃣ Testing new SDC endpoint: /Questionnaire/e16A_korrektur/$populate');
  try {
    const response = await fetch('http://localhost:3001/Questionnaire/e16A_korrektur/$populate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(populateParameters)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
    } else {
      const result = await response.json();
      console.log('✅ SDC populate successful!');
      console.log('📋 Number of populated items:', result.item?.length || 0);
      console.log('📝 Sample populated data:');
      if (result.item && result.item.length > 0) {
        for (let i = 0; i < Math.min(3, result.item.length); i++) {
          const item = result.item[i];
          const value = item.answer?.[0]?.valueString || item.answer?.[0]?.valueDate || '(no answer)';
          console.log(`   - ${item.text}: ${value}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ SDC test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test legacy endpoint for comparison
  console.log('2️⃣ Testing legacy endpoint: /$populate');
  const legacyParams = {
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "questionaireId",
        "valueCoding": {
          "code": "e16A_korrektur",
          "system": "http://gematik.de/fhir/ti-flow/CodeSystem/flow-operation-forms-cs"
        }
      },
      {
        "name": "fhirResources",
        "resource": sampleBundle
      }
    ]
  };

  try {
    const response = await fetch('http://localhost:3001/$populate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(legacyParams)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
    } else {
      const result = await response.json();
      console.log('✅ Legacy populate successful!');
      console.log('📋 Number of populated items:', result.item?.length || 0);
    }
  } catch (error) {
    console.error('❌ Legacy test failed:', error.message);
  }
}

// Run the test
testBothEndpoints();
