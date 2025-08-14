import type { Patient, Prescription, FhirBundle } from '../types';

interface ParsedPrescriptionData {
  patient: Patient;
  prescription: Prescription;
  fhirBundle: FhirBundle;
}

export class MinimalFhirParser {
  
  static async parsePrescriptionFile(filePath: string): Promise<ParsedPrescriptionData> {
    try {
      console.log(`🔄 Parsing: ${filePath}`);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const xmlText = await response.text();
      
      // Use simple regex/string parsing for now to ensure it works
      const bundleId = this.extractValue(xmlText, /<id value="([^"]+)"/) || 'unknown';
      const prescriptionId = this.extractValue(xmlText, /<identifier>.*?<value value="([^"]+)".*?<\/identifier>/s) || bundleId;
      
      // Extract patient name
      const firstName = this.extractValue(xmlText, /<given[^>]*value="([^"]+)"/) || 
                       this.extractValue(xmlText, /<given[^>]*>([^<]+)<\/given>/) || 'Unknown';
      const lastName = this.extractValue(xmlText, /<family[^>]*value="([^"]+)"/) || 
                      this.extractValue(xmlText, /<family[^>]*>([^<]+)<\/family>/) || 'Patient';
      
      // Extract medication name
      const medicationName = this.extractValue(xmlText, /<text value="([^"]+)".*?Tabletten/i) ||
                             this.extractValue(xmlText, /<text value="([^"]+mg[^"]*)"/) ||
                             this.extractValue(xmlText, /<text[^>]*>([^<]*(?:mg|Tabletten)[^<]*)<\/text>/i) ||
                             'Extracted Medication';
      
      // Extract doctor name - look for Practitioner section
      const doctorMatch = xmlText.match(/<Practitioner.*?<name.*?<prefix[^>]*value="([^"]*)".*?<given[^>]*value="([^"]*)".*?<family[^>]*value="([^"]*)"/s);
      const doctorName = doctorMatch ? `${doctorMatch[1]} ${doctorMatch[2]} ${doctorMatch[3]}`.trim() : 'Dr. Extracted';
      
      // Extract birth date
      const birthDate = this.extractValue(xmlText, /<birthDate value="([^"]+)"/) || '1980-01-01';
      
      // Create patient
      const patient: Patient = {
        id: `patient-${bundleId}`,
        firstName,
        lastName,
        dateOfBirth: this.formatDate(birthDate),
        address: 'Extracted Address',
        insuranceNumber: 'EXT123456'
      };
      
      // Create prescription
      const prescription: Prescription = {
        id: prescriptionId,
        patientId: patient.id,
        medication: medicationName,
        dosage: 'Nach ärztlicher Anweisung',
        quantity: 1,
        doctor: doctorName,
        issueDate: new Date().toLocaleDateString('de-DE'),
        status: 'pending',
        compositionType: 'e16A'
      };
      
      // Create minimal bundle
      const fhirBundle: FhirBundle = {
        id: bundleId,
        prescriptionId,
        timestamp: new Date().toISOString(),
        entries: []
      };
      
      console.log(`✅ Parsed: ${medicationName} for ${firstName} ${lastName}`);
      
      return { patient, prescription, fhirBundle };
      
    } catch (error) {
      console.error(`❌ Parse error for ${filePath}:`, error);
      throw error;
    }
  }
  
  private static extractValue(text: string, regex: RegExp): string | null {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }
  
  private static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateString;
    }
  }
}
