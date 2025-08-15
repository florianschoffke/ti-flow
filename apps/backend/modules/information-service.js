import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fhirpath from 'fhirpath';

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

  /**
   * Get questionnaire by ID (looks for questionnaire with matching id field)
   * @param {string} questionnaireId - Questionnaire ID
   * @returns {Object|null} Questionnaire or null if not found
   */
  getQuestionnaireById(questionnaireId) {
    try {
      // First try to find questionnaire by exact ID match in e16A folder
      const e16APath = join(this.formsPath, 'e16A');
      if (existsSync(e16APath)) {
        const files = readdirSync(e16APath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const filePath = join(e16APath, file);
          try {
            const data = readFileSync(filePath, 'utf8');
            const questionnaire = JSON.parse(data);
            if (questionnaire.id === questionnaireId) {
              console.log(`📋 Found questionnaire by ID: ${questionnaireId} in ${file}`);
              return questionnaire;
            }
          } catch (error) {
            console.warn(`Warning: Could not parse ${file}:`, error.message);
          }
        }
      }

      // Try other directories
      const directories = readdirSync(this.formsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const dir of directories) {
        if (dir === 'e16A') continue; // Already checked
        
        const dirPath = join(this.formsPath, dir);
        if (existsSync(dirPath)) {
          const files = readdirSync(dirPath).filter(f => f.endsWith('.json'));
          for (const file of files) {
            const filePath = join(dirPath, file);
            try {
              const data = readFileSync(filePath, 'utf8');
              const questionnaire = JSON.parse(data);
              if (questionnaire.id === questionnaireId) {
                console.log(`📋 Found questionnaire by ID: ${questionnaireId} in ${dir}/${file}`);
                return questionnaire;
              }
            } catch (error) {
              console.warn(`Warning: Could not parse ${dir}/${file}:`, error.message);
            }
          }
        }
      }

      // Fallback: try by code matching (legacy behavior)
      console.log(`📋 No questionnaire found with ID ${questionnaireId}, trying by code...`);
      return this.getQuestionnaireByCode(questionnaireId);

    } catch (error) {
      console.error(`Error loading questionnaire for ID ${questionnaireId}:`, error);
      return null;
    }
  }

  /**
   * Get questionnaire by operation code
   * @param {string} code - Operation code
   * @returns {Object|null} Questionnaire or null if not found
   */
  getQuestionnaireByCode(code) {
    try {
      const formPath = join(this.formsPath, 'request-operations', `${code}-form.json`);
      
      if (existsSync(formPath)) {
        const formData = readFileSync(formPath, 'utf8');
        return JSON.parse(formData);
      }

      // Try other form directories
      const requestOpsCS = this.getRequestOperations();
      for (const concept of requestOpsCS.concept) {
        const altFormPath = join(this.formsPath, concept.code, `${code}-form.json`);
        if (existsSync(altFormPath)) {
          const formData = readFileSync(altFormPath, 'utf8');
          return JSON.parse(formData);
        }
      }

      // Try document operations forms
      const docOpsCS = this.getDocumentOperations();
      for (const concept of docOpsCS.concept) {
        if (concept.concept) {
          for (const subConcept of concept.concept) {
            if (subConcept.code === code) {
              const formPath = join(this.formsPath, concept.code, `${code}-form.json`);
              if (existsSync(formPath)) {
                const formData = readFileSync(formPath, 'utf8');
                return JSON.parse(formData);
              }
            }
          }
        } else if (concept.code === code) {
          const formPath = join(this.formsPath, concept.code, `${code}-form.json`);
          if (existsSync(formPath)) {
            const formData = readFileSync(formPath, 'utf8');
            return JSON.parse(formData);
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Error loading questionnaire for code ${code}:`, error);
      return null;
    }
  }

  /**
   * Populate a QuestionnaireResponse using SDC expression-based population
   * @param {Object} questionnaire - FHIR Questionnaire
   * @param {Object} fhirBundle - FHIR Bundle with resources for population
   * @returns {Object} Populated FHIR QuestionnaireResponse
   */
  populateQuestionnaireResponse(questionnaire, fhirBundle) {
    const responseId = `populated-${Date.now()}`;
    
    const response = {
      resourceType: 'QuestionnaireResponse',
      id: responseId,
      meta: {
        profile: [
          'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse'
        ]
      },
      status: 'in-progress',
      questionnaire: questionnaire.url || `Questionnaire/${questionnaire.id}`,
      authored: new Date().toISOString(),
      item: []
    };

    // Process each questionnaire item
    if (questionnaire.item) {
      for (const item of questionnaire.item) {
        const responseItem = this.populateItem(item, fhirBundle);
        if (responseItem) {
          response.item.push(responseItem);
        }
      }
    }

    return response;
  }

  /**
   * Populate a single questionnaire item using FHIRPath expressions
   * @param {Object} item - Questionnaire item
   * @param {Object} fhirBundle - FHIR Bundle for population context
   * @returns {Object|null} Populated response item or null
   */
  populateItem(item, fhirBundle) {
    const responseItem = {
      linkId: item.linkId,
      text: item.text
    };

    // Look for initialExpression extension
    const initialExpression = item.extension?.find(ext => 
      ext.url === 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression'
    );

    if (initialExpression && initialExpression.valueExpression) {
      try {
        // Simple FHIRPath expression evaluation for common patterns
        const expression = initialExpression.valueExpression.expression;
        
        // Add special logging for medication_name field
        if (item.linkId === 'medication_name') {
          console.log(`🔍 Evaluating medication_name with expression: ${expression}`);
          console.log(`📦 Bundle entries count: ${fhirBundle?.entry?.length || 0}`);
          if (fhirBundle?.entry) {
            console.log(`📦 Entry types: ${fhirBundle.entry.map(e => e.resource?.resourceType).join(', ')}`);
            const medEntry = fhirBundle.entry.find(e => e.resource?.resourceType === 'Medication');
            if (medEntry) {
              console.log(`💊 Found Medication resource:`, JSON.stringify(medEntry.resource, null, 2));
            } else {
              console.log(`❌ No Medication resource found in bundle`);
            }
          }
        }
        
        const populatedValue = this.evaluateSimpleFHIRPath(expression, fhirBundle);
        
        // Add logging for medication_name result
        if (item.linkId === 'medication_name') {
          console.log(`💊 Medication name evaluation result: "${populatedValue}"`);
        }
        
        if (populatedValue !== null && populatedValue !== undefined && populatedValue !== '') {
          // Create answer based on item type
          const answer = this.createAnswerForType(item.type, populatedValue);
          if (answer) {
            responseItem.answer = [answer];
          }
        }
      } catch (error) {
        console.warn(`Failed to evaluate expression for item ${item.linkId}:`, error.message);
      }
    }

    return responseItem;
  }

  /**
   * SDC-compliant FHIRPath expression evaluator
   * @param {string} expression - FHIRPath expression from questionnaire initialExpression
   * @param {Object} bundle - FHIR Bundle context
   * @returns {string|null} Evaluated value or null
   */
  evaluateSimpleFHIRPath(expression, bundle) {
    try {
      console.log(`📊 Evaluating FHIRPath: ${expression}`);
      console.log(`📦 Bundle context:`, JSON.stringify(bundle, null, 2));
      
      // Handle %resource replacement properly - %resource refers to the bundle in our case
      // Remove %resource. prefix since we're evaluating against the bundle directly
      let processedExpression = expression.replace(/%resource\./g, '');
      console.log(`🔄 Processed expression: ${processedExpression}`);
      
      // Use the fhirpath library for proper FHIRPath evaluation
      const result = fhirpath.evaluate(bundle, processedExpression);
      console.log(`📊 FHIRPath result:`, result);
      
      if (Array.isArray(result) && result.length > 0) {
        // Return the first result, converted to string
        const firstResult = result[0];
        const stringResult = firstResult !== null && firstResult !== undefined ? String(firstResult) : null;
        console.log(`✅ Returning: ${stringResult}`);
        return stringResult;
      }
      
      console.log(`❌ No result found`);
      return null;
      
    } catch (error) {
      console.warn(`❌ FHIRPath evaluation failed for expression: ${expression}`);
      console.warn(`❌ Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Create answer object based on item type
   * @param {string} type - Question item type
   * @param {*} value - Value to set
   * @returns {Object|null} Answer object
   */
  createAnswerForType(type, value) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'string':
      case 'text':
        return { valueString: String(value) };
      case 'date':
        return { valueDate: value };
      case 'dateTime':
        return { valueDateTime: value };
      case 'boolean':
        return { valueBoolean: Boolean(value) };
      case 'integer':
        return { valueInteger: parseInt(value) };
      case 'decimal':
        return { valueDecimal: parseFloat(value) };
      default:
        return { valueString: String(value) };
    }
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
      const { code } = req.query;
      
      if (code) {
        // Return specific questionnaire for the operation code
        console.log(`📋 Serving questionnaire for operation code: ${code}`);
        const questionnaire = informationService.getQuestionnaireByCode(code);
        
        if (!questionnaire) {
          return res.status(404).json({
            error: 'Questionnaire not found',
            message: `No questionnaire found for operation code: ${code}`
          });
        }
        
        res.setHeader('Content-Type', 'application/fhir+json');
        res.json(questionnaire);
      } else {
        // Return the full CodeSystem as before
        console.log('📋 Serving request operations CodeSystem');
        const codeSystem = informationService.getRequestOperations();
        
        res.setHeader('Content-Type', 'application/fhir+json');
        res.json(codeSystem);
      }
    } catch (error) {
      console.error('Error serving request operations:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Could not retrieve request operations'
      });
    }
  });

  // Populate endpoint - new SDC-compliant version  
  app.post('/Questionnaire/:id/\\$populate', (req, res) => {
    try {
      console.log('🔄 Processing SDC $populate request');
      const questionnaireId = req.params.id;
      const fhirParameters = req.body;
      
      console.log(`🎯 Smart endpoint: Looking for questionnaire with ID: ${questionnaireId}`);
      
      // Validate basic FHIR Parameters structure
      if (!fhirParameters || fhirParameters.resourceType !== 'Parameters') {
        return res.status(400).json({
          error: 'Invalid request format',
          message: 'Request body must be a FHIR Parameters resource'
        });
      }

      if (!fhirParameters.parameter || !Array.isArray(fhirParameters.parameter)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'Parameters array is required'
        });
      }

      // Find the context parameter
      const contextParam = fhirParameters.parameter.find(p => p.name === 'context');
      if (!contextParam || !contextParam.part) {
        return res.status(400).json({
          error: 'Missing context parameter',
          message: 'context parameter with parts is required'
        });
      }

      // Extract context.name and context.content
      let contextName = null;
      let contextContent = null;

      for (const part of contextParam.part) {
        if (part.name === 'name' && part.valueString) {
          contextName = part.valueString;
        } else if (part.name === 'content' && part.resource) {
          contextContent = part.resource;
        }
      }

      if (!contextContent) {
        return res.status(400).json({
          error: 'Missing context content',
          message: 'context.content (resource) is required'
        });
      }

      console.log(` Context name: ${contextName || 'not specified'}`);
      console.log(`📦 Context content: ${contextContent.resourceType || 'unknown'} with ${contextContent.entry?.length || 0} entries`);

      // Smart questionnaire lookup by ID
      const questionnaire = informationService.getQuestionnaireById(questionnaireId);
      if (!questionnaire) {
        return res.status(404).json({
          error: 'Questionnaire not found',
          message: `No questionnaire found with ID: ${questionnaireId}`
        });
      }

      console.log(`✅ Found questionnaire: ${questionnaire.title || questionnaire.id}`);

      // Populate the questionnaire response
      const populatedResponse = informationService.populateQuestionnaireResponse(questionnaire, contextContent);

      // Return the response in SDC Parameters format
      const parametersResponse = {
        resourceType: 'Parameters',
        id: `populate-response-${Date.now()}`,
        meta: {
          profile: [
            'http://hl7.org/fhir/uv/sdc/StructureDefinition/parameters'
          ]
        },
        parameter: [
          {
            name: 'response',
            resource: populatedResponse
          }
        ]
      };

      res.setHeader('Content-Type', 'application/fhir+json');
      res.json(parametersResponse);
      
    } catch (error) {
      console.error('Error processing populate request:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Could not process populate request: ' + error.message
      });
    }
  });

  // Legacy populate endpoint - keep for backward compatibility
  app.post('/\\$populate', (req, res) => {
    try {
      console.log('🔄 Processing legacy populate request');
      const fhirParameters = req.body;
      
      // Validate basic FHIR Parameters structure
      if (!fhirParameters || fhirParameters.resourceType !== 'Parameters') {
        return res.status(400).json({
          error: 'Invalid request format',
          message: 'Request body must be a FHIR Parameters resource'
        });
      }

      if (!fhirParameters.parameter || !Array.isArray(fhirParameters.parameter)) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'Parameters array is required'
        });
      }

      // Extract questionnaireId and fhirResources from parameters (legacy format)
      let questionnaireId = null;
      let fhirBundle = null;

      for (const param of fhirParameters.parameter) {
        if (param.name === 'questionaireId' && param.valueCoding) {
          questionnaireId = param.valueCoding.code;
        } else if (param.name === 'fhirResources' && param.resource) {
          fhirBundle = param.resource;
        }
      }

      if (!questionnaireId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'questionaireId parameter with valueCoding is required'
        });
      }

      if (!fhirBundle) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'fhirResources parameter with resource is required'
        });
      }

      console.log(`📋 Populating questionnaire: ${questionnaireId}`);
      console.log(`📦 Received ${fhirBundle.resourceType || 'unknown'} resource with ${fhirBundle.entry?.length || 0} entries`);

      // Load the questionnaire
      const questionnaire = informationService.getQuestionnaireByCode(questionnaireId);
      if (!questionnaire) {
        return res.status(404).json({
          error: 'Questionnaire not found',
          message: `No questionnaire found for code: ${questionnaireId}`
        });
      }

      // Populate the questionnaire response
      const populatedResponse = informationService.populateQuestionnaireResponse(questionnaire, fhirBundle);

      res.setHeader('Content-Type', 'application/fhir+json');
      res.json(populatedResponse);
      
    } catch (error) {
      console.error('Error processing populate request:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Could not process populate request: ' + error.message
      });
    }
  });

  // Register endpoints for documentation
  if (registerEndpoint) {
    registerEndpoint('Information Service', 'GET', '/$document-operations', 'FHIR DocumentOperations CodeSystem');
    registerEndpoint('Information Service', 'GET', '/$request-operations', 'FHIR RequestOperations CodeSystem');
    registerEndpoint('Information Service', 'POST', '/Questionnaire/:id/$populate', 'SDC $populate operation for questionnaires');
    registerEndpoint('Information Service', 'POST', '/$populate', 'Legacy populate endpoint');
  }

  console.log('✅ Information Service module loaded');
  console.log('📋 Document Operations endpoint: /\\$document-operations');
  console.log('📋 Request Operations endpoint: /\\$request-operations');
  console.log('🔄 SDC Populate endpoint: /Questionnaire/:id/\\$populate');
  console.log('🔄 Legacy Populate endpoint: /\\$populate');
}

export { InformationService };
