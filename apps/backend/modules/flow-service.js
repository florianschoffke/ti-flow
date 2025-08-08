import { readFileSync, writeFileSync, existsSync } from 'fs';
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
 * Handles questionnaire population and flow request processing with state management
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
  createRequest(requester, receiver, questionnaire) {
    const db = this.loadDatabase();
    
    // Generate IDs
    const taskId = this.generateTaskId(db);
    const questionnaireId = this.generateQuestionnaireId(db);
    const now = new Date().toISOString();

    // Store questionnaire
    db.questionnaires[questionnaireId] = {
      id: questionnaireId,
      ...questionnaire,
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
      questionnaireId
    };

    db.tasks[taskId] = task;
    this.saveDatabase(db);

    return { taskId, questionnaireId, task };
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    const db = this.loadDatabase();
    return db.tasks[taskId] || null;
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
        reference: `Organization/${task.requester}`
      },
      owner: {
        reference: `Organization/${task.owner}`
      },
      for: {
        reference: `Organization/${task.receiver}`
      },
      input: [
        {
          type: {
            text: "questionnaire"
          },
          valueReference: {
            reference: `Questionnaire/${task.questionnaireId}`
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

  // POST /$request - Create new flow request
  app.post('/Task/$request', (req, res) => {
    try {
      const { requester, receiver, questionnaire } = req.body;
      
      if (!requester || !receiver || !questionnaire) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'requester, receiver, and questionnaire are required'
        });
      }

      const result = flowService.createRequest(requester, receiver, questionnaire);
      
      res.status(201).json({
        message: 'Flow request created successfully',
        taskId: result.taskId,
        questionnaireId: result.questionnaireId,
        task: flowService.toFhirTask(result.task)
      });
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ error: 'Internal server error' });
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
  registerEndpoint('Flow Service', 'GET', '/Task/:id', 'Get task status as FHIR Task resource');
  registerEndpoint('Flow Service', 'GET', '/Questionnaire/:id', 'Get questionnaire as FHIR Questionnaire resource');
  registerEndpoint('Flow Service', 'POST', '/Task/$request', 'Create new flow request with questionnaire');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$counter-offer', 'Submit counter-offer with updated questionnaire');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$reject', 'Reject a flow request (no content)');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$accept', 'Accept a flow request (no content)');
  registerEndpoint('Flow Service', 'POST', '/Task/:id/$close', 'Close/complete a request with document data');

  console.log('✅ Flow Service module loaded');
  console.log('� Flow service endpoints configured:');
  console.log('   GET /Task/:id - Get task status');
  console.log('   GET /Questionnaire/:id - Get questionnaire');
  console.log('   POST /Task/$request - Create new request');
  console.log('   POST /Task/:id/$counter-offer - Submit counter-offer');
  console.log('   POST /Task/:id/$reject - Reject request');
  console.log('   POST /Task/:id/$accept - Accept request');
  console.log('   POST /Task/:id/$close - Close/complete request');
}

export { FlowService };
