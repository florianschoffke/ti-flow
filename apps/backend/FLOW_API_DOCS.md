# TI-Flow Service API Documentation

## Overview

The TI-Flow Service implements a state-based flow management system for healthcare workflows, particularly focused on prescription requests and responses between pharmacies and doctors.

## State Model

The service implements the following state transitions based on the provided state diagram:

```
requested → received → in_progress(Anfragender/Bearbeiter) → accepted → completed
                                ↓                                ↓
                             rejected ←--------------------------|
```

## Endpoints

### 1. Create Flow Request
**POST** `/$request`

Creates a new flow request with a questionnaire.

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "requester": "organization-id",
  "receiver": "organization-id",
  "questionnaire": {
    "title": "Request Title",
    "description": "Request Description",
    "items": [
      {
        "linkId": "item-id",
        "text": "Question Text",
        "type": "string",
        "required": true
      }
    ]
  }
}
```

**Response:**
```json
{
  "message": "Flow request created successfully",
  "taskId": "1",
  "questionnaireId": "1",
  "task": { /* FHIR Task resource */ }
}
```

### 2. Get Task Status
**GET** `/Task/:id`

Retrieves the current status of a task as a FHIR Task resource.

**Headers:**
- `x-actor-id: organization-id` (optional, used to mark as received)

**Response:**
```json
{
  "resourceType": "Task",
  "id": "1",
  "status": "received",
  "businessStatus": { "text": "received" },
  "intent": "order",
  "priority": "routine",
  "description": "Flow request task",
  "authoredOn": "2025-08-08T10:45:01.058Z",
  "lastModified": "2025-08-08T10:45:07.530Z",
  "requester": { "reference": "Organization/pharmacy-001" },
  "owner": { "reference": "Organization/pharmacy-001" },
  "for": { "reference": "Organization/doctor-001" },
  "input": [{
    "type": { "text": "questionnaire" },
    "valueReference": { "reference": "Questionnaire/1" }
  }]
}
```

### 3. Get Questionnaire
**GET** `/Questionnaire/:id`

Retrieves a questionnaire as a FHIR Questionnaire resource.

**Response:**
```json
{
  "resourceType": "Questionnaire",
  "id": "1",
  "status": "active",
  "date": "2025-08-08T10:45:01.058Z",
  "title": "Prescription Request",
  "description": "Request for prescription clarification",
  "items": [
    {
      "linkId": "patient-name",
      "text": "Patient Name",
      "type": "string",
      "required": true
    }
  ]
}
```

### 4. Submit Counter-Offer
**POST** `/:id/$counter-offer`

Submits a counter-offer with an updated questionnaire.

**Headers:**
- `Content-Type: application/json`
- `x-actor-id: organization-id` (required)

**Body:**
```json
{
  "questionnaire": {
    "title": "Counter-offer Title",
    "description": "Modified details",
    "items": [
      {
        "linkId": "item-id",
        "text": "Question Text",
        "type": "string",
        "required": true,
        "initial": [{ "valueString": "Pre-filled answer" }]
      }
    ]
  }
}
```

### 5. Reject Request
**POST** `/:id/$reject`

Rejects a flow request (no content required).

**Headers:**
- `x-actor-id: organization-id` (required)

**Response:**
```json
{
  "message": "Task rejected successfully",
  "task": { /* FHIR Task resource */ }
}
```

### 6. Accept Request
**POST** `/:id/$accept`

Accepts a flow request (no content required).

**Headers:**
- `x-actor-id: organization-id` (required)

**Response:**
```json
{
  "message": "Task accepted successfully",
  "task": { /* FHIR Task resource */ }
}
```

### 7. Close/Complete Request
**POST** `/:id/$close`

Closes and completes a request with document data.

**Headers:**
- `Content-Type: application/json`
- `x-actor-id: organization-id` (required)

**Body:**
```json
{
  "docId": "document-identifier",
  "docPw": "document-password"
}
```

**Response:**
```json
{
  "message": "Task completed successfully",
  "task": { /* FHIR Task resource */ }
}
```

## State Transitions

1. **requested → received**: Automatically happens when the receiver first accesses the task via GET /Task/:id
2. **received → in_progress**: Happens when a counter-offer is submitted
3. **in_progress → accepted**: Happens when the other party accepts the current state
4. **accepted → completed**: Happens when the task is closed with document data
5. **Any state → rejected**: Can happen from most states when a party rejects the request

## Data Storage

The service uses a local JSON file (`data/flow-db.json`) to store:
- Tasks with their metadata and current state
- Questionnaires and their content
- Document data when tasks are completed

## Example Workflow

1. Pharmacy creates a prescription request:
   ```bash
   curl -X POST http://localhost:3001/$request \
     -H "Content-Type: application/json" \
     -d '{"requester": "pharmacy-001", "receiver": "doctor-001", "questionnaire": {...}}'
   ```

2. Doctor retrieves the request (marks as received):
   ```bash
   curl -X GET http://localhost:3001/Task/1 -H "x-actor-id: doctor-001"
   ```

3. Doctor submits a counter-offer:
   ```bash
   curl -X POST http://localhost:3001/1/$counter-offer \
     -H "Content-Type: application/json" \
     -H "x-actor-id: doctor-001" \
     -d '{"questionnaire": {...}}'
   ```

4. Pharmacy accepts the counter-offer:
   ```bash
   curl -X POST http://localhost:3001/1/$accept -H "x-actor-id: pharmacy-001"
   ```

5. Doctor closes the request with prescription data:
   ```bash
   curl -X POST http://localhost:3001/1/$close \
     -H "Content-Type: application/json" \
     -H "x-actor-id: doctor-001" \
     -d '{"docId": "prescription-123", "docPw": "secure-password"}'
   ```

## Error Handling

The service returns appropriate HTTP status codes:
- `200 OK`: Successful operation
- `201 Created`: Successful creation
- `400 Bad Request`: Missing required fields or invalid operation
- `404 Not Found`: Task or questionnaire not found
- `500 Internal Server Error`: Server error

All error responses include a descriptive error message.
