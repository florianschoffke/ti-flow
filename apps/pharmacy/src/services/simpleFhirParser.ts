import type { Patient, Prescription, FhirBundle } from '../types';

interface ParsedPrescriptionData {
  patient: Patient;
  prescription: Prescription;
  fhirBundle: FhirBundle;
}

export class SimpleFhirParser {
  
  static async parsePrescriptionFile(filePath: string): Promise<ParsedPrescriptionData> {
    try {
      console.log(`🔍 Parsing FHIR file: ${filePath}`);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        console.error(`❌ HTTP error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      console.log(`📄 Fetched XML, length: ${xmlText.length} chars`);
      console.log(`📄 First 200 chars: ${xmlText.substring(0, 200)}...`);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('❌ XML parsing error:', parserError.textContent);
        throw new Error(`XML parsing failed: ${parserError.textContent}`);
      }

      console.log(`✅ XML parsed successfully, root element: ${xmlDoc.documentElement.tagName}`);
      return this.extractPrescriptionData(xmlDoc);
    } catch (error) {
      console.error(`❌ Failed to parse ${filePath}:`, error);
      throw error;
    }
  }

  private static extractPrescriptionData(xmlDoc: Document): ParsedPrescriptionData {
    // Extract basic bundle information
    const bundleId = this.getValue(xmlDoc, 'Bundle > id', 'value') || 'unknown';
    const prescriptionId = this.getValue(xmlDoc, 'Bundle > identifier > value', 'value') || bundleId;
    const timestamp = this.getValue(xmlDoc, 'Bundle > timestamp', 'value') || new Date().toISOString();

    console.log(`📋 Bundle: ${bundleId}, Prescription: ${prescriptionId}`);

    // Extract patient information
    const patient = this.extractPatient(xmlDoc);
    console.log(`👤 Patient: ${patient.firstName} ${patient.lastName}`);

    // Extract medication information
    const medication = this.extractMedication(xmlDoc);
    console.log(`💊 Medication: ${medication.name}`);

    // Extract practitioner information
    const practitioner = this.extractPractitioner(xmlDoc);
    console.log(`👨‍⚕️ Doctor: ${practitioner.name}`);

    // Extract medication request information
    const medicationRequest = this.extractMedicationRequest(xmlDoc);
    console.log(`📝 Request: ${medicationRequest.quantity} units, issued ${medicationRequest.authoredOn}`);

    // Get composition type
    const compositionType = this.getValue(xmlDoc, 'Composition > type > coding > code', 'value') || 'e16A';

    // Create simplified prescription object
    const prescription: Prescription = {
      id: prescriptionId,
      patientId: patient.id,
      medication: medication.name,
      dosage: medication.dosage || medicationRequest.dosage || 'Nach Anweisung',
      quantity: medicationRequest.quantity,
      doctor: practitioner.name,
      issueDate: this.formatDate(medicationRequest.authoredOn || timestamp),
      status: 'pending',
      compositionType
    };

    // Create basic FHIR bundle structure
    const fhirBundle: FhirBundle = {
      id: bundleId,
      prescriptionId,
      timestamp,
      entries: [] // We'll keep this simple for now
    };

    console.log(`✅ Successfully parsed prescription: ${prescription.medication}`);

    return {
      patient,
      prescription,
      fhirBundle
    };
  }

  private static extractPatient(xmlDoc: Document): Patient {
    const patientElement = xmlDoc.querySelector('Patient');
    if (!patientElement) {
      throw new Error('No Patient element found');
    }

    const id = this.getValue(patientElement, 'id', 'value') || 'unknown';
    const familyName = this.getValue(patientElement, 'name > family', 'value') || 
                      patientElement.querySelector('name > family')?.textContent || '';
    const givenName = this.getValue(patientElement, 'name > given', 'value') ||
                     patientElement.querySelector('name > given')?.textContent || '';
    const birthDate = this.getValue(patientElement, 'birthDate', 'value') || '';
    const insuranceNumber = this.getValue(patientElement, 'identifier > value', 'value') || '';

    // Extract address
    const addressElement = patientElement.querySelector('address');
    let address = '';
    if (addressElement) {
      const line = this.getValue(addressElement, 'line', 'value') || 
                   addressElement.querySelector('line')?.textContent || '';
      const city = this.getValue(addressElement, 'city', 'value') || '';
      const postalCode = this.getValue(addressElement, 'postalCode', 'value') || '';
      const country = this.getValue(addressElement, 'country', 'value') || '';
      
      address = [line, `${postalCode} ${city}`, country].filter(Boolean).join(', ');
    }

    return {
      id,
      firstName: givenName,
      lastName: familyName,
      dateOfBirth: this.formatDate(birthDate),
      address,
      insuranceNumber
    };
  }

  private static extractMedication(xmlDoc: Document): { name: string; dosage?: string } {
    const medicationElement = xmlDoc.querySelector('Medication');
    if (!medicationElement) {
      return { name: 'Unbekanntes Medikament' };
    }

    // Try to get medication name from code text
    let name = this.getValue(medicationElement, 'code > text', 'value') ||
               medicationElement.querySelector('code > text')?.textContent || '';

    // If no text, try to get from coding display
    if (!name) {
      name = this.getValue(medicationElement, 'code > coding > display', 'value') || '';
    }

    // Extract dosage from ingredient strength
    let dosage = '';
    const strengthElement = medicationElement.querySelector('ingredient > strength');
    if (strengthElement) {
      const value = this.getValue(strengthElement, 'numerator > value', 'value') || '';
      const unit = this.getValue(strengthElement, 'numerator > unit', 'value') || '';
      if (value && unit) {
        dosage = `${value} ${unit}`;
      }
    }

    return {
      name: name || 'Unbekanntes Medikament',
      dosage
    };
  }

  private static extractPractitioner(xmlDoc: Document): { name: string } {
    const practitionerElement = xmlDoc.querySelector('Practitioner');
    if (!practitionerElement) {
      return { name: 'Unbekannter Arzt' };
    }

    const prefix = this.getValue(practitionerElement, 'name > prefix', 'value') ||
                   practitionerElement.querySelector('name > prefix')?.textContent || '';
    const given = this.getValue(practitionerElement, 'name > given', 'value') ||
                  practitionerElement.querySelector('name > given')?.textContent || '';
    const family = this.getValue(practitionerElement, 'name > family', 'value') ||
                   practitionerElement.querySelector('name > family')?.textContent || '';

    const parts = [prefix, given, family].filter(Boolean);
    return {
      name: parts.length > 0 ? parts.join(' ') : 'Unbekannter Arzt'
    };
  }

  private static extractMedicationRequest(xmlDoc: Document): { quantity: number; authoredOn: string; dosage?: string } {
    const medicationRequestElement = xmlDoc.querySelector('MedicationRequest');
    
    const quantityValue = this.getValue(medicationRequestElement, 'dispenseRequest > quantity > value', 'value') || '1';
    const authoredOn = this.getValue(medicationRequestElement, 'authoredOn', 'value') || '';
    const dosageText = this.getValue(medicationRequestElement, 'dosageInstruction > text', 'value') ||
                      medicationRequestElement?.querySelector('dosageInstruction > text')?.textContent || '';

    return {
      quantity: parseInt(quantityValue, 10) || 1,
      authoredOn,
      dosage: dosageText
    };
  }

  private static getValue(element: Element | Document | null, selector: string, attribute: string = 'value'): string {
    if (!element) return '';
    
    const targetElement = element.querySelector(selector);
    if (!targetElement) return '';
    
    return targetElement.getAttribute(attribute) || '';
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
