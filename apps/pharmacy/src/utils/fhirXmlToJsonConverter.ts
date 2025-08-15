/**
 * Utility to convert FHIR XML to JSON format for populate endpoint
 */
export class FhirXmlToJsonConverter {
  
  static async convertXmlToJson(xmlFilePath: string): Promise<any> {
    try {
      console.log(`🔄 Converting FHIR XML to JSON: ${xmlFilePath}`);
      
      const response = await fetch(xmlFilePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch XML file: ${response.status}`);
      }
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(`XML parsing error: ${parserError.textContent}`);
      }
      
      return this.xmlToFhirJson(xmlDoc);
    } catch (error) {
      console.error('❌ Error converting XML to JSON:', error);
      throw error;
    }
  }
  
  private static xmlToFhirJson(xmlDoc: Document): any {
    const bundleElement = xmlDoc.querySelector('Bundle');
    if (!bundleElement) {
      throw new Error('No Bundle element found in XML');
    }
    
    // Extract bundle-level information
    const bundle: any = {
      resourceType: 'Bundle',
      id: this.getElementValue(bundleElement, 'id'),
      type: this.getElementAttribute(bundleElement, 'type', 'value') || 'document',
      timestamp: this.getElementValue(bundleElement, 'timestamp'),
      entry: []
    };
    
    // Extract bundle identifier
    const identifierElement = bundleElement.querySelector('identifier');
    if (identifierElement) {
      bundle.identifier = {
        system: this.getElementValue(identifierElement, 'system'),
        value: this.getElementValue(identifierElement, 'value')
      };
    }
    
    // Convert each entry
    const entryElements = bundleElement.querySelectorAll('entry');
    entryElements.forEach(entryElement => {
      const entry = this.convertEntry(entryElement);
      if (entry) {
        bundle.entry.push(entry);
      }
    });
    
    console.log(`✅ Converted bundle with ${bundle.entry.length} entries`);
    return bundle;
  }
  
  private static convertEntry(entryElement: Element): any | null {
    const fullUrl = this.getElementValue(entryElement, 'fullUrl');
    const resourceElement = entryElement.querySelector('resource > *');
    
    if (!resourceElement) {
      return null;
    }
    
    const resourceType = resourceElement.tagName;
    const resource = this.convertResource(resourceElement, resourceType);
    
    return {
      fullUrl,
      resource
    };
  }
  
  private static convertResource(resourceElement: Element, resourceType: string): any {
    const resource: any = {
      resourceType,
      id: this.getElementValue(resourceElement, 'id')
    };
    
    switch (resourceType) {
      case 'Patient':
        return this.convertPatient(resourceElement, resource);
      case 'Medication':
        return this.convertMedication(resourceElement, resource);
      case 'MedicationRequest':
        return this.convertMedicationRequest(resourceElement, resource);
      case 'Practitioner':
        return this.convertPractitioner(resourceElement, resource);
      case 'Organization':
        return this.convertOrganization(resourceElement, resource);
      case 'Composition':
        return this.convertComposition(resourceElement, resource);
      default:
        console.log(`⚠️ Unknown resource type: ${resourceType}`);
        return resource;
    }
  }
  
  private static convertPatient(element: Element, resource: any): any {
    // Identifiers
    resource.identifier = [];
    element.querySelectorAll('identifier').forEach(idElement => {
      const identifier: any = {
        value: this.getElementValue(idElement, 'value')
      };
      
      const typeElement = idElement.querySelector('type');
      if (typeElement) {
        identifier.type = {
          coding: [{
            system: this.getElementValue(typeElement, 'coding system'),
            code: this.getElementValue(typeElement, 'coding code')
          }]
        };
      }
      
      const system = this.getElementValue(idElement, 'system');
      if (system) {
        identifier.system = system;
      }
      
      resource.identifier.push(identifier);
    });
    
    // Names
    resource.name = [];
    element.querySelectorAll('name').forEach(nameElement => {
      const name: any = {
        use: this.getElementAttribute(nameElement, '', 'use') || 'official',
        family: this.getElementValue(nameElement, 'family'),
        given: []
      };
      
      nameElement.querySelectorAll('given').forEach(givenElement => {
        name.given.push(givenElement.getAttribute('value') || givenElement.textContent?.trim());
      });
      
      resource.name.push(name);
    });
    
    // Birth date
    const birthDateElement = element.querySelector('birthDate');
    if (birthDateElement) {
      resource.birthDate = birthDateElement.getAttribute('value');
    }
    
    return resource;
  }
  
  private static convertMedication(element: Element, resource: any): any {
    // Code
    const codeElement = element.querySelector('code');
    if (codeElement) {
      resource.code = {};
      
      const textElement = codeElement.querySelector('text');
      if (textElement) {
        resource.code.text = textElement.getAttribute('value');
      }
      
      // Coding
      const codingElements = codeElement.querySelectorAll('coding');
      if (codingElements.length > 0) {
        resource.code.coding = [];
        codingElements.forEach(codingElement => {
          resource.code.coding.push({
            system: this.getElementValue(codingElement, 'system'),
            code: this.getElementValue(codingElement, 'code'),
            display: this.getElementValue(codingElement, 'display')
          });
        });
      }
    }
    
    return resource;
  }
  
  private static convertMedicationRequest(element: Element, resource: any): any {
    resource.status = this.getElementAttribute(element, 'status', 'value') || 'active';
    resource.intent = this.getElementAttribute(element, 'intent', 'value') || 'order';
    
    // Subject reference
    const subjectElement = element.querySelector('subject reference');
    if (subjectElement) {
      resource.subject = {
        reference: subjectElement.getAttribute('value')
      };
    }
    
    // Medication reference
    const medicationElement = element.querySelector('medicationReference reference');
    if (medicationElement) {
      resource.medicationReference = {
        reference: medicationElement.getAttribute('value')
      };
    }
    
    // Requester
    const requesterElement = element.querySelector('requester reference');
    if (requesterElement) {
      resource.requester = {
        reference: requesterElement.getAttribute('value')
      };
    }
    
    // Authored on
    const authoredOnElement = element.querySelector('authoredOn');
    if (authoredOnElement) {
      resource.authoredOn = authoredOnElement.getAttribute('value');
    }
    
    return resource;
  }
  
  private static convertPractitioner(element: Element, resource: any): any {
    // Identifiers
    resource.identifier = [];
    element.querySelectorAll('identifier').forEach(idElement => {
      const identifier: any = {
        value: this.getElementValue(idElement, 'value')
      };
      
      const typeElement = idElement.querySelector('type');
      if (typeElement) {
        identifier.type = {
          coding: [{
            system: this.getElementValue(typeElement, 'coding system'),
            code: this.getElementValue(typeElement, 'coding code')
          }]
        };
      }
      
      const system = this.getElementValue(idElement, 'system');
      if (system) {
        identifier.system = system;
      }
      
      resource.identifier.push(identifier);
    });
    
    // Names
    resource.name = [];
    element.querySelectorAll('name').forEach(nameElement => {
      const name: any = {
        use: this.getElementAttribute(nameElement, '', 'use') || 'official',
        family: this.getElementValue(nameElement, 'family'),
        given: [],
        prefix: []
      };
      
      nameElement.querySelectorAll('given').forEach(givenElement => {
        name.given.push(givenElement.getAttribute('value') || givenElement.textContent?.trim());
      });
      
      nameElement.querySelectorAll('prefix').forEach(prefixElement => {
        name.prefix.push(prefixElement.getAttribute('value') || prefixElement.textContent?.trim());
      });
      
      resource.name.push(name);
    });
    
    return resource;
  }
  
  private static convertOrganization(element: Element, resource: any): any {
    const nameElement = element.querySelector('name');
    if (nameElement) {
      resource.name = nameElement.getAttribute('value') || nameElement.textContent?.trim();
    }
    
    return resource;
  }
  
  private static convertComposition(element: Element, resource: any): any {
    resource.status = this.getElementAttribute(element, 'status', 'value') || 'final';
    
    const typeElement = element.querySelector('type');
    if (typeElement) {
      resource.type = {
        coding: [{
          system: this.getElementValue(typeElement, 'coding system'),
          code: this.getElementValue(typeElement, 'coding code'),
          display: this.getElementValue(typeElement, 'coding display')
        }]
      };
    }
    
    return resource;
  }
  
  private static getElementValue(parent: Element, selector: string): string | undefined {
    const element = parent.querySelector(selector);
    return element?.getAttribute('value') || element?.textContent?.trim();
  }
  
  private static getElementAttribute(parent: Element, selector: string, attribute: string): string | undefined {
    const element = selector ? parent.querySelector(selector) : parent;
    return element?.getAttribute(attribute) || undefined;
  }
}
