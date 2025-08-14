import type { 
  Patient, 
  Prescription, 
  FhirBundle, 
  FhirEntry, 
  FhirResource
} from '../types';

interface ParsedPrescriptionData {
  patient: Patient;
  prescription: Prescription;
  fhirBundle: FhirBundle;
}

export class FhirPrescriptionParser {
  
  static async parsePrescriptionFile(filePath: string): Promise<ParsedPrescriptionData> {
    try {
      console.log(`🔍 Attempting to parse FHIR file: ${filePath}`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch prescription file: ${response.status}`);
      }
      
      const xmlText = await response.text();
      console.log(`📄 XML content length: ${xmlText.length} characters`);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('❌ XML parsing error:', parserError.textContent);
        throw new Error(`XML parsing error: ${parserError.textContent}`);
      }
      
      console.log(`✅ XML parsed successfully`);
      const result = this.parseXmlBundle(xmlDoc);
      console.log(`✅ Successfully parsed prescription: ${result.prescription.medication}`);
      return result;
    } catch (error) {
      console.error('❌ Error parsing prescription file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse prescription file: ${filePath} - ${errorMessage}`);
    }
  }

  private static parseXmlBundle(xmlDoc: Document): ParsedPrescriptionData {
    const bundleElement = xmlDoc.querySelector('Bundle');
    if (!bundleElement) {
      throw new Error('No Bundle element found in FHIR document');
    }

    console.log(`📦 Found Bundle element`);

    // Parse bundle metadata
    const bundleId = this.getAttributeValue(bundleElement, 'id');
    const prescriptionId = this.getElementValue(bundleElement, 'identifier value') || bundleId;
    const timestamp = this.getAttributeValue(bundleElement, 'timestamp');

    console.log(`📋 Bundle ID: ${bundleId}, Prescription ID: ${prescriptionId}`);

    // Parse all entries
    const entries: FhirEntry[] = [];
    const entryElements = bundleElement.querySelectorAll('entry');
    
    console.log(`📝 Found ${entryElements.length} entries in bundle`);
    
    entryElements.forEach((entryElement, index) => {
      const fullUrl = this.getElementValue(entryElement, 'fullUrl');
      const resourceElement = entryElement.querySelector('resource > *');
      
      if (resourceElement && fullUrl) {
        const resource = this.parseResource(resourceElement);
        console.log(`📄 Entry ${index}: ${resource.resourceType} (${resource.id})`);
        entries.push({
          fullUrl,
          resource
        });
      }
    });

    const fhirBundle: FhirBundle = {
      id: bundleId,
      prescriptionId,
      timestamp,
      entries
    };

    // Extract specific resources
    const patient = this.extractPatient(entries);
    const medication = this.extractMedication(entries);
    const medicationRequest = this.extractMedicationRequest(entries);
    const practitioner = this.extractPractitioner(entries);
    const composition = this.extractComposition(entries);

    // Create simplified prescription object
    const prescription: Prescription = {
      id: prescriptionId,
      patientId: patient.id,
      medication: this.getMedicationName(medication),
      dosage: this.getDosageString(medication, medicationRequest),
      quantity: this.getQuantity(medicationRequest),
      doctor: this.getPractitionerName(practitioner),
      issueDate: this.formatDate(medicationRequest?.authoredOn || timestamp),
      status: 'pending',
      compositionType: this.getCompositionType(composition)
    };

    return {
      patient,
      prescription,
      fhirBundle
    };
  }

  private static parseResource(element: Element): FhirResource {
    const resource: FhirResource = {
      resourceType: element.tagName,
      id: this.getAttributeValue(element, 'id') || '',
    };

    // Add all other attributes and elements as properties
    this.addElementProperties(element, resource);
    
    return resource;
  }

  private static addElementProperties(element: Element, obj: any): void {
    // Add attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name !== 'xmlns') {
        obj[attr.name] = attr.value;
      }
    }

    // Add child elements
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tagName = child.tagName;
      
      if (!obj[tagName]) {
        obj[tagName] = [];
      }
      
      const childObj: any = {};
      this.addElementProperties(child, childObj);
      
      // If the element has a value attribute, use it directly
      const valueAttr = child.getAttribute('value');
      if (valueAttr && Object.keys(childObj).length === 1 && childObj.value) {
        obj[tagName].push(valueAttr);
      } else if (Object.keys(childObj).length > 0) {
        obj[tagName].push(childObj);
      } else if (child.textContent?.trim()) {
        obj[tagName].push(child.textContent.trim());
      }
    }

    // Clean up single-element arrays
    Object.keys(obj).forEach(key => {
      if (Array.isArray(obj[key]) && obj[key].length === 1 && typeof obj[key][0] === 'string') {
        obj[key] = obj[key][0];
      }
    });
  }

  private static extractPatient(entries: FhirEntry[]): Patient {
    const patientEntry = entries.find(entry => 
      entry.resource.resourceType === 'Patient'
    );

    if (!patientEntry) {
      throw new Error('No Patient resource found in bundle');
    }

    const patientResource = patientEntry.resource as any;
    
    const name = Array.isArray(patientResource.name) ? patientResource.name[0] : patientResource.name;
    const identifier = Array.isArray(patientResource.identifier) ? patientResource.identifier[0] : patientResource.identifier;
    const address = Array.isArray(patientResource.address) ? patientResource.address[0] : patientResource.address;

    return {
      id: patientResource.id,
      firstName: name?.given || '',
      lastName: name?.family || '',
      dateOfBirth: this.formatDate(patientResource.birthDate),
      address: this.formatAddress(address),
      insuranceNumber: identifier?.value || ''
    };
  }

  private static extractMedication(entries: FhirEntry[]): any {
    const medicationEntry = entries.find(entry => 
      entry.resource.resourceType === 'Medication'
    );
    return medicationEntry?.resource;
  }

  private static extractMedicationRequest(entries: FhirEntry[]): any {
    const medicationRequestEntry = entries.find(entry => 
      entry.resource.resourceType === 'MedicationRequest'
    );
    return medicationRequestEntry?.resource;
  }

  private static extractPractitioner(entries: FhirEntry[]): any {
    const practitionerEntry = entries.find(entry => 
      entry.resource.resourceType === 'Practitioner'
    );
    return practitionerEntry?.resource;
  }

  private static extractComposition(entries: FhirEntry[]): any {
    const compositionEntry = entries.find(entry => 
      entry.resource.resourceType === 'Composition'
    );
    return compositionEntry?.resource;
  }

  private static getMedicationName(medication: any): string {
    if (!medication) return 'Unbekanntes Medikament';
    
    const code = medication.code;
    if (code?.text) return code.text;
    if (Array.isArray(code?.coding) && code.coding[0]?.display) {
      return code.coding[0].display;
    }
    
    return 'Unbekanntes Medikament';
  }

  private static getDosageString(medication: any, medicationRequest: any): string {
    // Try to get dosage from medication request first
    if (medicationRequest?.dosageInstruction?.[0]?.text) {
      return medicationRequest.dosageInstruction[0].text;
    }

    // Fall back to ingredient strength from medication
    if (medication?.ingredient?.[0]?.strength) {
      const strength = medication.ingredient[0].strength;
      const numerator = strength.numerator;
      if (numerator?.value && numerator?.unit) {
        return `${numerator.value} ${numerator.unit}`;
      }
    }

    return 'Nach Anweisung';
  }

  private static getQuantity(medicationRequest: any): number {
    const quantity = medicationRequest?.dispenseRequest?.quantity?.value;
    return parseInt(quantity) || 1;
  }

  private static getPractitionerName(practitioner: any): string {
    if (!practitioner) return 'Unbekannter Arzt';
    
    const name = Array.isArray(practitioner.name) ? practitioner.name[0] : practitioner.name;
    if (!name) return 'Unbekannter Arzt';

    const parts = [];
    if (name.prefix) parts.push(name.prefix);
    if (name.given) parts.push(name.given);
    if (name.family) parts.push(name.family);

    return parts.length > 0 ? parts.join(' ') : 'Unbekannter Arzt';
  }

  private static getCompositionType(composition: any): string {
    if (!composition?.type?.coding) return 'e16A';
    
    const coding = Array.isArray(composition.type.coding) ? 
      composition.type.coding[0] : composition.type.coding;
    
    return coding?.code || 'e16A';
  }

  private static formatAddress(address: any): string {
    if (!address) return '';
    
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

  private static formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch (error) {
      return dateString;
    }
  }

  private static getAttributeValue(element: Element, selector: string): string {
    const targetElement = element.querySelector(selector);
    return targetElement?.getAttribute('value') || '';
  }

  private static getElementValue(element: Element, selector: string): string {
    const targetElement = element.querySelector(selector);
    return targetElement?.getAttribute('value') || targetElement?.textContent?.trim() || '';
  }
}
