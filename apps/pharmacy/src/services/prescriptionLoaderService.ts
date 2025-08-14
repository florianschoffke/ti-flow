import type { Patient, Prescription, FhirBundle } from '../types';
import { MinimalFhirParser } from './minimalFhirParser';

interface PrescriptionData {
  patients: Patient[];
  prescriptions: Prescription[];
  fhirBundles: FhirBundle[];
}

export class PrescriptionLoaderService {
  private static prescriptionFiles = [
    '/data/prescriptions/Beispiel_1_PZN.xml',
    '/data/prescriptions/Beispiel_22_Freitextverordnung.xml',
    '/data/prescriptions/Beispiel_3_PKV.xml'
  ];

  static async loadPrescriptions(): Promise<PrescriptionData> {
    const patients: Patient[] = [];
    const prescriptions: Prescription[] = [];
    const fhirBundles: FhirBundle[] = [];
    const patientMap = new Map<string, Patient>();

    try {
      console.log('🔄 Loading prescriptions from FHIR XML files...');
      
      // Load each prescription file
      const loadPromises = this.prescriptionFiles.map(async (filePath) => {
        try {
          console.log(`🔄 Loading prescription from: ${filePath}`);
          const parsedData = await MinimalFhirParser.parsePrescriptionFile(filePath);
          
          // Add unique patients
          if (!patientMap.has(parsedData.patient.id)) {
            patientMap.set(parsedData.patient.id, parsedData.patient);
            patients.push(parsedData.patient);
          }
          
          prescriptions.push(parsedData.prescription);
          fhirBundles.push(parsedData.fhirBundle);
          
          console.log(`✅ Successfully loaded prescription: ${parsedData.prescription.medication}`);
        } catch (error) {
          console.error(`❌ Failed to load prescription from ${filePath}:`, error);
          // Continue loading other files even if one fails
        }
      });

      await Promise.all(loadPromises);

      // If no prescriptions were loaded, use hardcoded fallback
      if (prescriptions.length === 0) {
        console.warn('⚠️ No prescriptions could be loaded from FHIR files, using hardcoded fallback data');
        return { ...this.getHardcodedFallbackData(), fhirBundles: [] };
      }

      console.log(`✅ Successfully loaded ${prescriptions.length} prescriptions from FHIR files`);
      return { patients, prescriptions, fhirBundles };
    } catch (error) {
      console.error('❌ Error loading prescriptions:', error);
      console.log('🔄 Using hardcoded fallback data');
      return { ...this.getHardcodedFallbackData(), fhirBundles: [] };
    }
  }

  private static getHardcodedFallbackData(): { patients: Patient[]; prescriptions: Prescription[] } {
    const fallbackPatient: Patient = {
      id: 'fallback-patient-1',
      firstName: 'Max',
      lastName: 'Mustermann',
      dateOfBirth: '01.01.1980',
      address: 'Musterstraße 1, 12345 Berlin',
      insuranceNumber: 'FB123456789'
    };

    const fallbackPrescriptions: Prescription[] = [
      {
        id: 'fallback-rx-001',
        patientId: fallbackPatient.id,
        medication: 'Fallback Medikament 500mg',
        dosage: 'Nach Anweisung',
        quantity: 1,
        doctor: 'Dr. med. Fallback',
        issueDate: new Date().toLocaleDateString('de-DE'),
        status: 'pending',
        compositionType: 'e16A'
      }
    ];

    console.log('📋 Using hardcoded fallback data');
    return {
      patients: [fallbackPatient],
      prescriptions: fallbackPrescriptions
    };
  }

  // Method to get complete FHIR data for a specific prescription
  static getFhirBundleForPrescription(prescriptionId: string, fhirBundles: FhirBundle[]): FhirBundle | null {
    return fhirBundles.find(bundle => bundle.prescriptionId === prescriptionId) || null;
  }
}
