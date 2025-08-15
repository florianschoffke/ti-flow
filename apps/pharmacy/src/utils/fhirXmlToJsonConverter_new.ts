import * as fhir from 'fhir';

/**
 * Utility to convert FHIR XML to JSON format using the official FHIR library
 */
export class FhirXmlToJsonConverter {
  private static fhirConverter = new fhir.Fhir();
  
  static async convertXmlToJson(xmlFilePath: string): Promise<any> {
    try {
      console.log(`Converting FHIR XML to JSON using official FHIR library: ${xmlFilePath}`);
      
      const response = await fetch(xmlFilePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch XML file: ${response.status}`);
      }
      
      const xmlText = await response.text();
      console.log(`XML file size: ${xmlText.length} characters`);
      
      // Use the official FHIR library to convert XML to JSON
      const jsonString = this.fhirConverter.xmlToJson(xmlText);
      const jsonBundle = JSON.parse(jsonString);
      
      console.log(`Successfully converted XML to JSON using FHIR library`);
      console.log(`Bundle type: ${jsonBundle.resourceType}`);
      console.log(`Bundle entries: ${jsonBundle.entry?.length || 0}`);
      
      if (jsonBundle.entry) {
        console.log(`Entry types: ${jsonBundle.entry.map((e: any) => e.resource?.resourceType).join(', ')}`);
        
        // Check for Medication resource specifically
        const medEntry = jsonBundle.entry.find((e: any) => e.resource?.resourceType === 'Medication');
        if (medEntry) {
          console.log('Found Medication resource:', JSON.stringify(medEntry.resource, null, 2));
        } else {
          console.log('No Medication resource found in converted bundle');
        }
      }
      
      return jsonBundle;
    } catch (error) {
      console.error('Error converting XML to JSON with FHIR library:', error);
      throw error;
    }
  }
}
