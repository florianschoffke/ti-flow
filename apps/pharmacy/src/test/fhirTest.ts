// Simple test to verify FHIR parsing works
import { SimpleFhirParser } from '../services/simpleFhirParser';

export async function testFhirParsing() {
  try {
    console.log('🧪 Testing FHIR parsing...');
    
    const testFile = '/data/prescriptions/Beispiel_1_PZN.xml';
    const result = await SimpleFhirParser.parsePrescriptionFile(testFile);
    
    console.log('✅ Test result:', {
      patient: result.patient,
      prescription: result.prescription
    });
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test automatically in development
if (typeof window !== 'undefined') {
  // Auto-run test when module loads
  setTimeout(() => {
    testFhirParsing().catch(console.error);
  }, 2000);
}
