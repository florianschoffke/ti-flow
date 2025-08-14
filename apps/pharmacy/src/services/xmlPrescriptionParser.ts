import type { Patient, Prescription } from '../types';

interface FhirBundle {
  entries: FhirEntry[];
  id: string;
  timestamp: string;
  prescriptionId: string;
  compositionType: string;
}

interface FhirEntry {
  fullUrl: string;
  resource: any;
}

interface ParsedPrescription {
  patient: Patient;
  prescription: Prescription;
}

export class XmlPrescriptionParser {
  static async parsePrescriptionFile(filePath: string): Promise<ParsedPrescription> {
    try {
      // In a real application, you would fetch the file from the server
      // For this POC, we'll use a static import approach
      const response = await fetch(filePath);
      const xmlText = await response.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      return this.parseXmlBundle(xmlDoc);
    } catch (error) {
      console.error('Error parsing prescription file:', error);
      throw new Error(`Failed to parse prescription file: ${filePath}`);
    }
  }

  static parseXmlBundle(xmlDoc: Document): ParsedPrescription {
    const bundle = this.extractBundleInfo(xmlDoc);
    const patient = this.extractPatient(xmlDoc);
    const medication = this.extractMedication(xmlDoc);
    const practitioner = this.extractPractitioner(xmlDoc);
    const medicationRequest = this.extractMedicationRequest(xmlDoc);

    const prescription: Prescription = {
      id: bundle.prescriptionId,
      patientId: patient.id,
      medication: medication.name,
      dosage: medication.dosage,
      quantity: medicationRequest.quantity,
      doctor: practitioner.name,
      issueDate: this.formatDate(medicationRequest.authoredOn || bundle.timestamp),
      status: 'pending',
      compositionType: bundle.compositionType
    };

    return { patient, prescription };
  }

  private static extractBundleInfo(xmlDoc: Document): FhirBundle {
    const bundleElement = xmlDoc.querySelector('Bundle');
    const identifierElement = bundleElement?.querySelector('identifier value');
    const timestampElement = bundleElement?.querySelector('timestamp');
    const compositionTypeElement = xmlDoc.querySelector('Composition type coding code');
    
    return {
      entries: [],
      id: bundleElement?.querySelector('id')?.getAttribute('value') || '',
      timestamp: timestampElement?.getAttribute('value') || '',
      prescriptionId: identifierElement?.getAttribute('value') || '',
      compositionType: compositionTypeElement?.getAttribute('value') || 'e16A'
    };
  }

  private static extractPatient(xmlDoc: Document): Patient {
    const patientElement = xmlDoc.querySelector('Patient');
    const patientId = patientElement?.querySelector('id')?.getAttribute('value') || '';
    
    const familyName = patientElement?.querySelector('name family')?.textContent || 
                      patientElement?.querySelector('name family')?.getAttribute('value') || '';
    const givenName = patientElement?.querySelector('name given')?.textContent ||
                     patientElement?.querySelector('name given')?.getAttribute('value') || '';
    
    const birthDate = patientElement?.querySelector('birthDate')?.getAttribute('value') || '';
    const insuranceNumber = patientElement?.querySelector('identifier value')?.getAttribute('value') || '';
    
    // Extract address
    const addressElement = patientElement?.querySelector('address');
    const street = addressElement?.querySelector('line')?.textContent ||
                   addressElement?.querySelector('line')?.getAttribute('value') || '';
    const city = addressElement?.querySelector('city')?.getAttribute('value') || '';
    const postalCode = addressElement?.querySelector('postalCode')?.getAttribute('value') || '';
    const country = addressElement?.querySelector('country')?.getAttribute('value') || '';

    return {
      id: patientId,
      firstName: givenName,
      lastName: familyName,
      dateOfBirth: this.formatDate(birthDate),
      address: `${street}, ${postalCode} ${city}, ${country}`.replace(/^,\s*/, '').replace(/,\s*$/, ''),
      insuranceNumber: insuranceNumber
    };
  }

  private static extractMedication(xmlDoc: Document): { name: string; dosage: string } {
    const medicationElement = xmlDoc.querySelector('Medication');
    const medicationName = medicationElement?.querySelector('code text')?.getAttribute('value') ||
                          medicationElement?.querySelector('code text')?.textContent || 
                          'Unbekanntes Medikament';

    // Extract dosage from ingredient strength
    const strengthElement = medicationElement?.querySelector('ingredient strength');
    const numeratorValue = strengthElement?.querySelector('numerator value')?.getAttribute('value') || '';
    const numeratorUnit = strengthElement?.querySelector('numerator unit')?.getAttribute('value') || '';
    
    let dosage = 'Nach Anweisung';
    if (numeratorValue && numeratorUnit) {
      dosage = `${numeratorValue} ${numeratorUnit}`;
    }

    return {
      name: medicationName,
      dosage: dosage
    };
  }

  private static extractPractitioner(xmlDoc: Document): { name: string } {
    const practitionerElement = xmlDoc.querySelector('Practitioner');
    const prefix = practitionerElement?.querySelector('name prefix')?.getAttribute('value') || '';
    const givenName = practitionerElement?.querySelector('name given')?.getAttribute('value') ||
                     practitionerElement?.querySelector('name given')?.textContent || '';
    const familyName = practitionerElement?.querySelector('name family')?.getAttribute('value') ||
                      practitionerElement?.querySelector('name family')?.textContent || '';

    const fullName = [prefix, givenName, familyName].filter(Boolean).join(' ');
    return {
      name: fullName || 'Unbekannter Arzt'
    };
  }

  private static extractMedicationRequest(xmlDoc: Document): { quantity: number; authoredOn: string } {
    const medicationRequestElement = xmlDoc.querySelector('MedicationRequest');
    const quantityElement = medicationRequestElement?.querySelector('dispenseRequest quantity value');
    const authoredOnElement = medicationRequestElement?.querySelector('authoredOn');

    const quantity = parseInt(quantityElement?.getAttribute('value') || '1', 10);
    const authoredOn = authoredOnElement?.getAttribute('value') || '';

    return {
      quantity,
      authoredOn
    };
  }

  private static formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch (error) {
      return dateString;
    }
  }
}
