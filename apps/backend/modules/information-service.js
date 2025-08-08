import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Information Service Module
 * Provides access to FHIR CodeSystems for operations and documents
 */
class InformationService {
  constructor() {
    this.dataPath = join(__dirname, '..', 'data', 'codesystems');
    this.formsPath = join(__dirname, '..', 'data', 'forms');
  }

  /**
   * Validate folder structure based on DocumentOperationsCS
   * @returns {Object} Validation result with status and any missing items
   */
  validateFolderStructure() {
    const result = {
      valid: true,
      missingFolders: [],
      missingForms: [],
      errors: []
    };

    try {
      // Read the document operations CodeSystem
      const docOpsCS = this.getDocumentOperations();
      
      // Check if forms directory exists
      if (!existsSync(this.formsPath)) {
        result.valid = false;
        result.errors.push('Forms directory does not exist: ' + this.formsPath);
        return result;
      }

      // Check each top-level concept
      for (const concept of docOpsCS.concept) {
        const folderPath = join(this.formsPath, concept.code);
        
        // Check if folder exists for this concept
        if (!existsSync(folderPath)) {
          result.valid = false;
          result.missingFolders.push(concept.code);
          continue;
        }

        // Check if subconcepts have corresponding form files
        if (concept.concept && concept.concept.length > 0) {
          for (const subConcept of concept.concept) {
            const formFileName = `${subConcept.code}-form.json`;
            const formPath = join(folderPath, formFileName);
            
            if (!existsSync(formPath)) {
              result.valid = false;
              result.missingForms.push({
                folder: concept.code,
                form: formFileName,
                path: formPath
              });
            }
          }
        } else {
          // For concepts without subconcepts, check for a form with the concept code
          const formFileName = `${concept.code}-form.json`;
          const formPath = join(folderPath, formFileName);
          
          if (!existsSync(formPath)) {
            result.valid = false;
            result.missingForms.push({
              folder: concept.code,
              form: formFileName,
              path: formPath
            });
          }
        }
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Error validating folder structure: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate RequestOperationsCS forms structure
   * @returns {Object} Validation result with status and any missing items
   */
  validateRequestOperationsForms() {
    const result = {
      valid: true,
      missingForms: [],
      errors: []
    };

    try {
      // Read the request operations CodeSystem
      const requestOpsCS = this.getRequestOperations();
      
      // Check if request-operations forms directory exists
      const requestOpsFormsPath = join(this.formsPath, 'request-operations');
      if (!existsSync(requestOpsFormsPath)) {
        result.valid = false;
        result.errors.push('Request operations forms directory does not exist: ' + requestOpsFormsPath);
        return result;
      }

      // Check each request operation concept has a corresponding form
      for (const concept of requestOpsCS.concept) {
        const formFileName = `${concept.code}-form.json`;
        const formPath = join(requestOpsFormsPath, formFileName);
        
        if (!existsSync(formPath)) {
          result.valid = false;
          result.missingForms.push({
            code: concept.code,
            form: formFileName,
            path: formPath,
            display: concept.display
          });
        }
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Error validating request operations forms: ${error.message}`);
    }

    return result;
  }

  /**
   * Read and parse a CodeSystem JSON file
   * @param {string} filename - Name of the CodeSystem file
   * @returns {Object} Parsed JSON data
   */
  readCodeSystem(filename) {
    try {
      const filePath = join(this.dataPath, filename);
      const data = readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading CodeSystem ${filename}:`, error);
      throw new Error(`Could not read CodeSystem: ${filename}`);
    }
  }

  /**
   * Get document operations CodeSystem
   * @returns {Object} Document operations CodeSystem
   */
  getDocumentOperations() {
    return this.readCodeSystem('CodeSystem-document-operations-cs.json');
  }

  /**
   * Get request operations CodeSystem  
   * @returns {Object} Request operations CodeSystem
   */
  getRequestOperations() {
    return this.readCodeSystem('CodeSystem-request-operations-cs.json');
  }
}

/**
 * Setup information service routes
 * @param {Express} app - Express application instance
 * @param {Function} registerEndpoint - Function to register endpoints for documentation
 */
export function setupInformationService(app, registerEndpoint) {
  const informationService = new InformationService();

  // Validate folder structure on startup
  console.log('🔍 Validating forms folder structure...');
  const validation = informationService.validateFolderStructure();
  
  if (validation.valid) {
    console.log('✅ Forms folder structure is valid');
  } else {
    console.log('⚠️  Forms folder structure validation failed:');
    
    if (validation.missingFolders.length > 0) {
      console.log('   Missing folders:', validation.missingFolders.join(', '));
    }
    
    if (validation.missingForms.length > 0) {
      console.log('   Missing forms:');
      validation.missingForms.forEach(item => {
        console.log(`     - ${item.folder}/${item.form}`);
      });
    }
    
    if (validation.errors.length > 0) {
      console.log('   Errors:');
      validation.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }
  }

  // Validate request operations forms
  console.log('🔍 Validating request operations forms...');
  const requestOpsValidation = informationService.validateRequestOperationsForms();
  
  if (requestOpsValidation.valid) {
    console.log('✅ Request operations forms are valid');
  } else {
    console.log('⚠️  Request operations forms validation failed:');
    
    if (requestOpsValidation.missingForms.length > 0) {
      console.log('   Missing forms:');
      requestOpsValidation.missingForms.forEach(item => {
        console.log(`     - ${item.code}: ${item.form} (${item.display})`);
      });
    }
    
    if (requestOpsValidation.errors.length > 0) {
      console.log('   Errors:');
      requestOpsValidation.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }
  }

  // Document Operations endpoint
  app.get('/\\$document-operations', (req, res) => {
    try {
      console.log('📋 Serving document operations CodeSystem');
      const codeSystem = informationService.getDocumentOperations();
      
      res.setHeader('Content-Type', 'application/fhir+json');
      res.json(codeSystem);
    } catch (error) {
      console.error('Error serving document operations:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Could not retrieve document operations'
      });
    }
  });

  // Request Operations endpoint  
  app.get('/\\$request-operations', (req, res) => {
    try {
      console.log('📋 Serving request operations CodeSystem');
      const codeSystem = informationService.getRequestOperations();
      
      res.setHeader('Content-Type', 'application/fhir+json');
      res.json(codeSystem);
    } catch (error) {
      console.error('Error serving request operations:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Could not retrieve request operations'
      });
    }
  });

  // Register endpoints for documentation
  if (registerEndpoint) {
    registerEndpoint('Information Service', 'GET', '/$document-operations', 'FHIR DocumentOperations CodeSystem');
    registerEndpoint('Information Service', 'GET', '/$request-operations', 'FHIR RequestOperations CodeSystem');
  }

  console.log('✅ Information Service module loaded');
  console.log('📋 Document Operations endpoint: /\\$document-operations');
  console.log('📋 Request Operations endpoint: /\\$request-operations');
}

export { InformationService };
