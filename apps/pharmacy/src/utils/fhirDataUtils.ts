import type { FhirBundle, FhirResource } from '../types';

export class FhirDataUtils {
  /**
   * Extract a specific resource type from a FHIR bundle
   */
  static getResourceByType<T extends FhirResource>(bundle: FhirBundle, resourceType: string): T | null {
    const entry = bundle.entries.find(entry => entry.resource.resourceType === resourceType);
    return entry ? (entry.resource as T) : null;
  }

  /**
   * Extract all resources of a specific type from a FHIR bundle
   */
  static getResourcesByType<T extends FhirResource>(bundle: FhirBundle, resourceType: string): T[] {
    return bundle.entries
      .filter(entry => entry.resource.resourceType === resourceType)
      .map(entry => entry.resource as T);
  }

  /**
   * Get a resource by its ID from a FHIR bundle
   */
  static getResourceById<T extends FhirResource>(bundle: FhirBundle, resourceId: string): T | null {
    const entry = bundle.entries.find(entry => entry.resource.id === resourceId);
    return entry ? (entry.resource as T) : null;
  }

  /**
   * Resolve a FHIR reference within a bundle
   */
  static resolveReference<T extends FhirResource>(bundle: FhirBundle, reference: string): T | null {
    // Handle different reference formats (urn:uuid:, Patient/, etc.)
    const entry = bundle.entries.find(entry => {
      return entry.fullUrl === reference || 
             entry.fullUrl === `urn:uuid:${reference}` ||
             entry.resource.id === reference.split('/').pop();
    });
    
    return entry ? (entry.resource as T) : null;
  }

  /**
   * Extract medication information for questionnaires
   */
  static getMedicationDetails(bundle: FhirBundle): {
    name: string;
    pzn?: string;
    dosage?: string;
    quantity?: number;
    instructions?: string;
  } {
    const medication = this.getResourceByType(bundle, 'Medication');
    const medicationRequest = this.getResourceByType(bundle, 'MedicationRequest');

    const result: any = {
      name: 'Unbekanntes Medikament'
    };

    if (medication) {
      // Extract medication name
      if (medication.code?.text) {
        result.name = medication.code.text;
      }

      // Extract PZN if available
      if (medication.code?.coding) {
        const pznCoding = Array.isArray(medication.code.coding) 
          ? medication.code.coding.find((c: any) => c.system?.includes('pzn'))
          : medication.code.coding;
        if (pznCoding?.code) {
          result.pzn = pznCoding.code;
        }
      }

      // Extract dosage from ingredient
      if (medication.ingredient?.[0]?.strength?.numerator) {
        const numerator = medication.ingredient[0].strength.numerator;
        result.dosage = `${numerator.value} ${numerator.unit}`;
      }
    }

    if (medicationRequest) {
      // Extract quantity
      if (medicationRequest.dispenseRequest?.quantity?.value) {
        result.quantity = parseInt(medicationRequest.dispenseRequest.quantity.value);
      }

      // Extract dosage instructions
      if (medicationRequest.dosageInstruction?.[0]?.text) {
        result.instructions = medicationRequest.dosageInstruction[0].text;
      }
    }

    return result;
  }

  /**
   * Extract patient information for questionnaires
   */
  static getPatientDetails(bundle: FhirBundle): {
    name: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    insuranceNumber?: string;
    address?: string;
  } {
    const patient = this.getResourceByType(bundle, 'Patient');
    
    if (!patient) {
      return {
        name: 'Unbekannter Patient',
        firstName: '',
        lastName: '',
        birthDate: ''
      };
    }

    const name = Array.isArray(patient.name) ? patient.name[0] : patient.name;
    const identifier = Array.isArray(patient.identifier) ? patient.identifier[0] : patient.identifier;
    const address = Array.isArray(patient.address) ? patient.address[0] : patient.address;

    const firstName = name?.given || '';
    const lastName = name?.family || '';
    
    return {
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      birthDate: patient.birthDate || '',
      insuranceNumber: identifier?.value,
      address: address ? this.formatAddress(address) : undefined
    };
  }

  /**
   * Extract practitioner information for questionnaires
   */
  static getPractitionerDetails(bundle: FhirBundle): {
    name: string;
    qualification?: string;
    lanr?: string;
  } {
    const practitioner = this.getResourceByType(bundle, 'Practitioner');
    
    if (!practitioner) {
      return { name: 'Unbekannter Arzt' };
    }

    const name = Array.isArray(practitioner.name) ? practitioner.name[0] : practitioner.name;
    const identifier = Array.isArray(practitioner.identifier) ? practitioner.identifier[0] : practitioner.identifier;
    const qualification = Array.isArray(practitioner.qualification) ? practitioner.qualification[0] : practitioner.qualification;

    const parts = [];
    if (name?.prefix) parts.push(name.prefix);
    if (name?.given) parts.push(name.given);
    if (name?.family) parts.push(name.family);

    return {
      name: parts.length > 0 ? parts.join(' ') : 'Unbekannter Arzt',
      qualification: qualification?.text,
      lanr: identifier?.value
    };
  }

  private static formatAddress(address: any): string {
    const parts = [];
    if (address.line) {
      const line = Array.isArray(address.line) ? address.line[0] : address.line;
      parts.push(line);
    }
    if (address.postalCode && address.city) {
      parts.push(`${address.postalCode} ${address.city}`);
    }
    if (address.country) {
      parts.push(address.country);
    }
    
    return parts.join(', ');
  }
}
