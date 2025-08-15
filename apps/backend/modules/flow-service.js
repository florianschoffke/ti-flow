import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Task status constants based on the state diagram
const TASK_STATUS = {
  REQUESTED: 'requested',
  RECEIVED: 'received',
  IN_PROGRESS_REQUESTER: 'in_progress(Anfragender)',
  IN_PROGRESS_PROCESSOR: 'in_progress(Bearbeiter)',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed'
};

/**
 * Flow Service Module
 * Hand  console.log('✅ Flow Se  console.log('✅ Flow Service module loaded');
  console.log('📋 Flow service endpoints configured:');
  console.log('   GET /Task?user=<user> - Get all tasks for user');
  console.log('   GET /Task/:id - Get task status');
  console.log('   GET /Questionnaire/:id - Get questionnaire');
  console.log('   GET /QuestionnaireResponse/:id - Get questionnaire response');
  console.log('   POST /Task/$request - Create new request'); module loaded');
  console.log('📋 Flow service endpoints configured:');
  console.log('   GET /Task?user=<user> - Get all tasks for user');
  console.log('   GET /Task/:id - Get task status'); questionnaire population and flow request processing with state management
 */
class FlowService {
  constructor() {
    this.dataPath = join(__dirname, '..', 'data');
    this.dbPath = join(this.dataPath, 'flow-db.json');
    this.resetDatabase(); // Reset database on startup
  }

  /**
   * Initialize the local database
   */
  initializeDatabase() {
    if (!existsSync(this.dbPath)) {
      const initialDb = {
        tasks: {},
        questionnaires: {},
        nextTaskId: 1,
        nextQuestionnaireId: 1
      };
      writeFileSync(this.dbPath, JSON.stringify(initialDb, null, 2));
    }
  }

  /**
   * Reset the database to initial state
   */
  resetDatabase() {
    console.log('🔄 Resetting flow database...');
    const initialDb = {
      tasks: {},
      questionnaires: {},
      nextTaskId: 1,
      nextQuestionnaireId: 1
    };
    writeFileSync(this.dbPath, JSON.stringify(initialDb, null, 2));
    console.log('✅ Flow database reset complete');
  }

  /**
   * Load database from file
   */
  loadDatabase() {
    try {
      const data = readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading database:', error);
      return { tasks: {}, questionnaires: {}, nextTaskId: 1, nextQuestionnaireId: 1 };
    }
  }

  /**
   * Save database to file
   */
  saveDatabase(db) {
    try {
      writeFileSync(this.dbPath, JSON.stringify(db, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  /**
   * Generate a new task ID
   */
  generateTaskId(db) {
    const id = db.nextTaskId.toString();
    db.nextTaskId++;
    return id;
  }

  /**
   * Generate a new questionnaire ID
   */
  generateQuestionnaireId(db) {
    const id = db.nextQuestionnaireId.toString();
    db.nextQuestionnaireId++;
    return id;
  }

  /**
   * Create a new flow request
   */
  createRequest(requester, receiver, questionnaireResponse) {
    const db = this.loadDatabase();
    
    // Generate IDs
    const taskId = this.generateTaskId(db);
    const questionnaireResponseId = this.generateQuestionnaireId(db);
    const now = new Date().toISOString();

    // Store questionnaire response
    db.questionnaires[questionnaireResponseId] = {
      id: questionnaireResponseId,
      ...questionnaireResponse,
      created: now
    };

    // Create task
    const task = {
      id: taskId,
      requester,
      receiver,
      created: now,
      updated: now,
      status: TASK_STATUS.REQUESTED,
      owner: requester, // Initially owned by requester
      questionnaireResponseId,
      type: 'flow-request'
    };

    db.tasks[taskId] = task;
    this.saveDatabase(db);

    return { taskId, questionnaireResponseId, task };
  }

  /**
   * Create a new document request with enhanced validation
   */
  createDocumentRequest(requester_tid, receiver_tid, questionnaireResponse) {
    const db = this.loadDatabase();
    
    // Generate IDs
    const taskId = this.generateTaskId(db);
    const questionnaireResponseId = this.generateQuestionnaireId(db);
    const now = new Date().toISOString();

    // Store questionnaire response
    db.questionnaires[questionnaireResponseId] = {
      id: questionnaireResponseId,
      ...questionnaireResponse,
      created: now
    };

    // Create task for document request with proper telematik-id format
    const task = {
      id: taskId,
      requester: `Organization/${requester_tid}`,
      receiver: `Organization/${receiver_tid}`,
      created: now,
      updated: now,
      status: TASK_STATUS.REQUESTED,
      owner: `Organization/${receiver_tid}`, // Owner is the receiver (where request goes to)
      questionnaireResponseId,
      type: 'document-request'
    };

    db.tasks[taskId] = task;
    this.saveDatabase(db);

    console.log(`📄 Document request created: Task ${taskId} from ${requester_tid} to ${receiver_tid}`);
    
    return { taskId, questionnaireResponseId, task };
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    const db = this.loadDatabase();
    return db.tasks[taskId] || null;
  }

  /**
   * Get all tasks for a user (where user is either requester or receiver)
   * For telematik-id format, checks against Organization/telematik-id
   */
  getTasksForUser(user) {
    const db = this.loadDatabase();
    const userTasks = [];
    
    for (const taskId in db.tasks) {
      const task = db.tasks[taskId];
      // Support both direct telematik-id and Organization/telematik-id format
      const requesterMatch = task.requester === user || task.requester === `Organization/${user}`;
      const receiverMatch = task.receiver === user || task.receiver === `Organization/${user}`;
      
      if (requesterMatch || receiverMatch) {
        userTasks.push(task);
      }
    }
    
    // Sort by creation date (newest first)
    return userTasks.sort((a, b) => new Date(b.created) - new Date(a.created));
  }

  /**
   * Find questionnaire form by URL
   */
  findQuestionnaireByUrl(url) {
    try {
      const formsPath = join(this.dataPath, 'forms');
      const categories = readdirSync(formsPath);
      
      for (const category of categories) {
        const categoryPath = join(formsPath, category);
        if (statSync(categoryPath).isDirectory()) {
          const files = readdirSync(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = join(categoryPath, file);
              try {
                const content = readFileSync(filePath, 'utf8');
                const questionnaire = JSON.parse(content);
                
                if (questionnaire.url === url) {
                  return questionnaire;
                }
              } catch (error) {
                console.warn(`Error reading form file ${filePath}:`, error.message);
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for questionnaire by URL:', error);
      return null;
    }
  }

  /**
   * Extract requester and receiver telematik-IDs from QuestionnaireResponse
   */
  extractRequesterAndReceiver(questionnaireResponse) {
    if (!questionnaireResponse.item) {
      return { requester_tid: null, receiver_tid: null };
    }

    let requester_tid = null;
    let receiver_tid = null;

    // Search through the items to find requester_tid and receiver_tid
    const findValueByLinkId = (items, linkId) => {
      for (const item of items) {
        if (item.linkId === linkId && item.answer && item.answer.length > 0) {
          // Look for valueString, valueInteger, or other value types in the first answer
          const answer = item.answer[0];
          if (answer.valueString) {
            return answer.valueString;
          } else if (answer.valueInteger !== undefined) {
            return answer.valueInteger.toString();
          } else if (answer.valueDecimal !== undefined) {
            return answer.valueDecimal.toString();
          } else if (answer.valueBoolean !== undefined) {
            return answer.valueBoolean.toString();
          }
        }
        // Recursively search nested items
        if (item.item && item.item.length > 0) {
          const nestedResult = findValueByLinkId(item.item, linkId);
          if (nestedResult) return nestedResult;
        }
      }
      return null;
    };

    requester_tid = findValueByLinkId(questionnaireResponse.item, 'requester_tid');
    receiver_tid = findValueByLinkId(questionnaireResponse.item, 'receiver_tid');

    return { requester_tid, receiver_tid };
  }

  /**
   * Update task status and owner
   */
  updateTaskStatus(taskId, newStatus, newOwner = null) {
    const db = this.loadDatabase();
    const task = db.tasks[taskId];
    
    if (!task) {
      return null;
    }

    task.status = newStatus;
    task.updated = new Date().toISOString();
    if (newOwner) {
      task.owner = newOwner;
    }

    db.tasks[taskId] = task;
    this.saveDatabase(db);
    return task;
  }

  /**
   * Mark task as received (when receiver downloads the request)
   */
  markAsReceived(taskId, receiver) {
    const task = this.getTask(taskId);
    if (!task || task.status !== TASK_STATUS.REQUESTED) {
      return null;
    }

    return this.updateTaskStatus(taskId, TASK_STATUS.RECEIVED, receiver);
  }

  /**
   * Process counter-offer
   */
  processCounterOffer(taskId, questionnaire, actor) {
    const task = this.getTask(taskId);
    if (!task || ![TASK_STATUS.RECEIVED, TASK_STATUS.IN_PROGRESS_REQUESTER, TASK_STATUS.IN_PROGRESS_PROCESSOR].includes(task.status)) {
      return null;
    }

    const db = this.loadDatabase();
    
    // Update questionnaire
    const questionnaireId = this.generateQuestionnaireId(db);
    db.questionnaires[questionnaireId] = {
      id: questionnaireId,
      ...questionnaire,
      created: new Date().toISOString()
    };

    // Update task
    task.questionnaireId = questionnaireId;
    db.tasks[taskId] = task;
    
    // Determine new status based on who is making the counter-offer
    const newStatus = actor === task.requester ? 
      TASK_STATUS.IN_PROGRESS_REQUESTER : 
      TASK_STATUS.IN_PROGRESS_PROCESSOR;

    const updatedTask = this.updateTaskStatus(taskId, newStatus, actor);
    
    this.saveDatabase(db);
    return updatedTask;
  }

  /**
   * Reject task
   */
  rejectTask(taskId, actor) {
    const task = this.getTask(taskId);
    if (!task || task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.REJECTED) {
      return null;
    }

    return this.updateTaskStatus(taskId, TASK_STATUS.REJECTED, actor);
  }

  /**
   * Accept task
   */
  acceptTask(taskId, actor) {
    const task = this.getTask(taskId);
    if (!task || ![TASK_STATUS.RECEIVED, TASK_STATUS.IN_PROGRESS_REQUESTER, TASK_STATUS.IN_PROGRESS_PROCESSOR].includes(task.status)) {
      return null;
    }

    return this.updateTaskStatus(taskId, TASK_STATUS.ACCEPTED, actor);
  }

  /**
   * Close/Complete task
   */
  closeTask(taskId, docData, actor) {
    const task = this.getTask(taskId);
    if (!task || task.status !== TASK_STATUS.ACCEPTED) {
      return null;
    }

    const db = this.loadDatabase();
    
    // Store document data with the task
    task.documentData = docData;
    
    const updatedTask = this.updateTaskStatus(taskId, TASK_STATUS.COMPLETED, actor);
    
    this.saveDatabase(db);
    return updatedTask;
  }

  /**
   * Get questionnaire by ID
   */
  getQuestionnaire(questionnaireId) {
    const db = this.loadDatabase();
    return db.questionnaires[questionnaireId] || null;
  }

  /**
   * Convert task to FHIR Task resource
   */
  toFhirTask(task) {
    if (!task) return null;

    // Helper function to ensure proper Organization reference format
    const ensureOrgReference = (value) => {
      if (!value) return value;
      if (value.startsWith('Organization/')) return value;
      return `Organization/${value}`;
    };

    return {
      resourceType: "Task",
      id: task.id,
      status: this.mapStatusToFhir(task.status),
      businessStatus: {
        text: task.status
      },
      intent: "order",
      priority: "routine",
      description: "Flow request task",
      authoredOn: task.created,
      lastModified: task.updated,
      requester: {
        reference: ensureOrgReference(task.requester)
      },
      owner: {
        reference: ensureOrgReference(task.owner)
      },
      for: {
        reference: ensureOrgReference(task.receiver)
      },
      input: [
        {
          type: {
            text: "questionnaire-response"
          },
          valueReference: {
            reference: `QuestionnaireResponse/${task.questionnaireResponseId}`
          }
        }
      ]
    };
  }

  /**
   * Map internal status to FHIR task status
   */
  mapStatusToFhir(status) {
    const statusMap = {
      [TASK_STATUS.REQUESTED]: 'requested',
      [TASK_STATUS.RECEIVED]: 'received',
      [TASK_STATUS.IN_PROGRESS_REQUESTER]: 'in-progress',
      [TASK_STATUS.IN_PROGRESS_PROCESSOR]: 'in-progress', 
      [TASK_STATUS.REJECTED]: 'rejected',
      [TASK_STATUS.ACCEPTED]: 'accepted',
      [TASK_STATUS.COMPLETED]: 'completed'
    };
    return statusMap[status] || 'unknown';
  }

  /**
   * Convert questionnaire to FHIR Questionnaire resource
   */
  toFhirQuestionnaire(questionnaire) {
    if (!questionnaire) return null;

    return {
      resourceType: "Questionnaire",
      id: questionnaire.id,
      status: "active",
      date: questionnaire.created,
      ...questionnaire
    };
  }
}

/**
 * Setup flow service routes
 * @param {Express} app - Express application instance
 * @param {Function} registerEndpoint - Function to register endpoints for documentation
 */
export function setupFlowService(app, registerEndpoint) {
  const flowService = new FlowService();

  // GET /Task?user=<user> - Get all tasks for a user (where user is requester or receiver)
  app.get('/Task', (req, res) => {
    try {
      const user = req.query.user;
      
      if (!user) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required query parameter: user'
        });
      }

      const tasks = flowService.getTasksForUser(user);
      const fhirTasks = tasks.map(task => flowService.toFhirTask(task));
      
      res.json({
        resourceType: 'Bundle',
        type: 'searchset',
        total: fhirTasks.length,
        entry: fhirTasks.map(task => ({
          resource: task
        }))
      });
    } catch (error) {
      console.error('Error getting tasks for user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /Task/:id - Get task status as FHIR Task
  app.get('/Task/:id', (req, res) => {
    try {
      const taskId = req.params.id;
      const task = flowService.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({
          error: 'Task not found',
          message: `Task with ID ${taskId} does not exist`
        });
      }

      // Mark as received if this is the first time the receiver accesses it
      if (task.status === TASK_STATUS.REQUESTED) {
        // In a real implementation, you'd identify the requester from auth headers
        // For now, we'll check if the request is from the receiver
        const receiverHeader = req.headers['x-actor-id'];
        if (receiverHeader === task.receiver) {
          flowService.markAsReceived(taskId, task.receiver);
          task.status = TASK_STATUS.RECEIVED;
          task.updated = new Date().toISOString();
        }
      }

      const fhirTask = flowService.toFhirTask(task);
      res.json(fhirTask);
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /Questionnaire/:id - Get questionnaire as FHIR Questionnaire
  app.get('/Questionnaire/:id', (req, res) => {
    try {
      const questionnaireId = req.params.id;
      const questionnaire = flowService.getQuestionnaire(questionnaireId);
      
      if (!questionnaire) {
        return res.status(404).json({
          error: 'Questionnaire not found',
          message: `Questionnaire with ID ${questionnaireId} does not exist`
        });
      }

      const fhirQuestionnaire = flowService.toFhirQuestionnaire(questionnaire);
      res.json(fhirQuestionnaire);
    } catch (error) {
      console.error('Error getting questionnaire:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /QuestionnaireResponse/:id - Get questionnaire response as FHIR QuestionnaireResponse
  app.get('/QuestionnaireResponse/:id', (req, res) => {
    try {
      const questionnaireResponseId = req.params.id;
      const questionnaireResponse = flowService.getQuestionnaire(questionnaireResponseId); // Using same storage for now
      
      if (!questionnaireResponse) {
        return res.status(404).json({
          error: 'QuestionnaireResponse not found',
          message: `QuestionnaireResponse with ID ${questionnaireResponseId} does not exist`
        });
      }

      res.json(questionnaireResponse);
    } catch (error) {
      console.error('Error getting questionnaire response:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /Task/$start-flow-request - Create new flow request
  app.post('/Task/\\$start-flow-request', (req, res) => {
    try {
      const { questionnaireResponse } = req.body;
      
      // Validate required fields
      if (!questionnaireResponse) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'questionnaireResponse is required'
        });
      }

      // Validate QuestionnaireResponse FHIR format
      if (!questionnaireResponse.resourceType || questionnaireResponse.resourceType !== 'QuestionnaireResponse') {
        return res.status(400).json({
          error: 'Invalid FHIR resource',
          message: 'questionnaireResponse must be a FHIR QuestionnaireResponse resource with resourceType: "QuestionnaireResponse"'
        });
      }

      // Extract requester and receiver from questionnaire response
      const { requester_tid, receiver_tid } = flowService.extractRequesterAndReceiver(questionnaireResponse);
      
      if (!requester_tid || !receiver_tid) {
        return res.status(400).json({
          error: 'Missing participant information',
          message: 'QuestionnaireResponse must contain requester_tid and receiver_tid fields'
        });
      }

      // Mock implementation - just return 201 as requested
      const mockTaskId = `flow-task-${Date.now()}`;
      const mockQuestionnaireResponseId = `flow-qr-${Date.now()}`;
      
      res.status(201).json({
        message: 'Flow request created successfully',
        taskId: mockTaskId,
        questionnaireResponseId: mockQuestionnaireResponseId,
        requester_tid,
        receiver_tid,
        task: {
          resourceType: 'Task',
          id: mockTaskId,
          status: 'requested',
          intent: 'order',
          description: 'Flow request task'
        }
      });
    } catch (error) {
      console.error('Error creating flow request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /Task/$start-document-request - Create new document request
  app.post('/Task/\\$start-document-request', (req, res) => {
    try {
      // Accept QuestionnaireResponse directly in request body
      const questionnaireResponse = req.body;
      
      // Validate required fields
      if (!questionnaireResponse || typeof questionnaireResponse !== 'object') {
        return res.status(400).json({
          error: 'Missing required resource',
          message: 'Request body must contain a QuestionnaireResponse resource'
        });
      }

      // Validate QuestionnaireResponse FHIR format
      if (!questionnaireResponse.resourceType || questionnaireResponse.resourceType !== 'QuestionnaireResponse') {
        return res.status(400).json({
          error: 'Invalid FHIR resource',
          message: 'Request body must be a FHIR QuestionnaireResponse resource with resourceType: "QuestionnaireResponse"'
        });
      }

      // Validate questionnaire field exists
      if (!questionnaireResponse.questionnaire) {
        return res.status(400).json({
          error: 'Missing questionnaire reference',
          message: 'QuestionnaireResponse must contain a "questionnaire" field with the questionnaire URL'
        });
      }

      // Find questionnaire form by URL
      const questionnaireUrl = questionnaireResponse.questionnaire;
      const questionnaire = flowService.findQuestionnaireByUrl(questionnaireUrl);
      
      if (!questionnaire) {
        return res.status(404).json({
          error: 'Questionnaire not found',
          message: `No questionnaire found with URL: ${questionnaireUrl}`
        });
      }

      console.log(`✅ Validated questionnaire: ${questionnaire.title} (${questionnaire.id})`);

      // Debug: Log the QuestionnaireResponse structure
      console.log('🔍 QuestionnaireResponse structure:', JSON.stringify(questionnaireResponse, null, 2));
      console.log('🔍 QuestionnaireResponse items:', questionnaireResponse.item?.map(item => ({ linkId: item.linkId, hasAnswer: !!item.answer })));

      // Extract requester and receiver from questionnaire response
      const { requester_tid, receiver_tid } = flowService.extractRequesterAndReceiver(questionnaireResponse);
      
      console.log('🔍 Extracted values:', { requester_tid, receiver_tid });
      
      if (!requester_tid || !receiver_tid) {
        return res.status(400).json({
          error: 'Missing participant information',
          message: 'QuestionnaireResponse must contain requester_tid and receiver_tid fields with values'
        });
      }

      console.log(`📋 Document request from ${requester_tid} to ${receiver_tid}`);

      // Create document request with telematik-ids extracted from form
      const result = flowService.createDocumentRequest(requester_tid, receiver_tid, questionnaireResponse);
      
      res.status(201).json({
        message: 'Document request created successfully',
        taskId: result.taskId,
        questionnaireResponseId: result.questionnaireResponseId,
        requester_tid,
        receiver_tid,
        task: flowService.toFhirTask(result.task)
      });
    } catch (error) {
      console.error('Error creating document request:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });

  // POST Task/:id/$counter-offer - Submit counter-offer
  app.post('/Task/:id/$counter-offer', (req, res) => {
    try {
      const taskId = req.params.id;
      const { questionnaire } = req.body;
      const actor = req.headers['x-actor-id']; // Actor identification
      
      if (!questionnaire) {
        return res.status(400).json({
          error: 'Missing questionnaire',
          message: 'questionnaire is required for counter-offer'
        });
      }

      if (!actor) {
        return res.status(400).json({
          error: 'Missing actor identification',
          message: 'x-actor-id header is required'
        });
      }

      const updatedTask = flowService.processCounterOffer(taskId, questionnaire, actor);
      
      if (!updatedTask) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'Cannot submit counter-offer for this task in current state'
        });
      }

      res.json({
        message: 'Counter-offer submitted successfully',
        task: flowService.toFhirTask(updatedTask)
      });
    } catch (error) {
      console.error('Error processing counter-offer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /Task/:id/$reject - Reject request
  app.post('/Task/:id/$reject', (req, res) => {
    try {
      const taskId = req.params.id;
      const actor = req.headers['x-actor-id']; // Actor identification
      
      if (!actor) {
        return res.status(400).json({
          error: 'Missing actor identification',
          message: 'x-actor-id header is required'
        });
      }

      const updatedTask = flowService.rejectTask(taskId, actor);
      
      if (!updatedTask) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'Cannot reject this task in current state'
        });
      }

      res.json({
        message: 'Task rejected successfully',
        task: flowService.toFhirTask(updatedTask)
      });
    } catch (error) {
      console.error('Error rejecting task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /:id/$accept - Accept request
  app.post('/Task/:id/$accept', (req, res) => {
    try {
      const taskId = req.params.id;
      const actor = req.headers['x-actor-id']; // Actor identification
      
      if (!actor) {
        return res.status(400).json({
          error: 'Missing actor identification',
          message: 'x-actor-id header is required'
        });
      }

      const updatedTask = flowService.acceptTask(taskId, actor);
      
      if (!updatedTask) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'Cannot accept this task in current state'
        });
      }

      res.json({
        message: 'Task accepted successfully',
        task: flowService.toFhirTask(updatedTask)
      });
    } catch (error) {
      console.error('Error accepting task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /:id/$close - Close/Complete request
  app.post('/Task/:id/$close', (req, res) => {
    try {
      const taskId = req.params.id;
      const { docId, docPw } = req.body;
      const actor = req.headers['x-actor-id']; // Actor identification
      
      if (!docId || !docPw) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'docId and docPw are required to close the task'
        });
      }

      if (!actor) {
        return res.status(400).json({
          error: 'Missing actor identification',
          message: 'x-actor-id header is required'
        });
      }

      const documentData = { docId, docPw };
      const updatedTask = flowService.closeTask(taskId, documentData, actor);
      
      if (!updatedTask) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'Cannot close this task in current state'
        });
      }

      res.json({
        message: 'Task completed successfully',
        task: flowService.toFhirTask(updatedTask)
      });
    } catch (error) {
      console.error('Error closing task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Register endpoints for documentation
  registerEndpoint('Flow Service', 'GET', '/Task', 'Get all tasks for a user (query param: user)');
  registerEndpoint('Flow Service', 'GET', '/Task/:id', 'Get task status as FHIR Task resource');
  registerEndpoint('Flow Service', 'GET', '/Questionnaire/:id', 'Get questionnaire as FHIR Questionnaire resource');
  registerEndpoint('Flow Service', 'GET', '/QuestionnaireResponse/:id', 'Get questionnaire response as FHIR QuestionnaireResponse resource');
  registerEndpoint('Flow Service', 'POST', '/Task/$start-flow-request', 'Create new flow request with questionnaire response');
  registerEndpoint('Flow Service', 'POST', '/Task/$start-document-request', 'Create new document request with questionnaire response');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$counter-offer', 'Submit counter-offer with updated questionnaire');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$reject', 'Reject a flow request (no content)');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$accept', 'Accept a flow request (no content)');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$close', 'Close/complete a request with document data');

  console.log('✅ Flow Service module loaded');
  console.log('📋 Flow service endpoints configured:');
  console.log('   GET /Task?user=<user> - Get all tasks for user');
  console.log('   GET /Task/:id - Get task status');
  console.log('   GET /Questionnaire/:id - Get questionnaire');
  console.log('   GET /QuestionnaireResponse/:id - Get questionnaire response');
  console.log('   POST /Task/$start-flow-request - Create new flow request');
  console.log('   POST /Task/$start-document-request - Create new document request');
  console.log('   POST /Task/:id/$counter-offer - Submit counter-offer');
  console.log('   POST /Task/:id/$reject - Reject request');
  console.log('   POST /Task/:id/$accept - Accept request');
  console.log('   POST /Task/:id/$close - Close/complete request');
}

export { FlowService };
