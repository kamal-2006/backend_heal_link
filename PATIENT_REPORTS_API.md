# Patient Medical Reports API Documentation

## Overview
This API allows patients to upload, manage, and view their own medical reports. Patients can upload various types of medical files including lab reports, prescriptions, imaging results, and other medical documents.

## Endpoints

### 1. Upload Medical Report
**POST** `/api/v1/records/patient/upload`

Upload one or more medical files with report details.

**Authentication:** Bearer token (patient role required)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `files` (required): Medical report files (max 5 files, 10MB each)
- `title` (required): Title of the medical report
- `recordType` (required): Type of record - one of: 'Lab', 'Imaging', 'Prescription', 'Consultation', 'Surgery', 'Other'
- `description` (optional): Detailed description of the report
- `reportDate` (optional): Date of the medical report (defaults to current date)
- `notes` (optional): Additional notes

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, TXT

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "record_id",
    "title": "Lab Results",
    "recordType": "Lab",
    "description": "Blood work results",
    "date": "2025-10-06T12:00:00.000Z",
    "fileUrl": "/uploads/medical-reports/filename.pdf",
    "status": "new",
    "patient": {...},
    "createdAt": "2025-10-06T12:00:00.000Z"
  },
  "uploadedFiles": [
    {
      "originalName": "lab_results.pdf",
      "filename": "patient_userId_timestamp.pdf",
      "size": 1024000,
      "url": "/uploads/medical-reports/patient_userId_timestamp.pdf"
    }
  ]
}
```

### 2. Get Patient's Medical Records
**GET** `/api/v1/records/patient/my-records`

Retrieve all medical records for the authenticated patient.

**Authentication:** Bearer token (patient role required)

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of records per page (default: 10)
- `recordType` (optional): Filter by record type
- `startDate` (optional): Filter records from this date (ISO format)
- `endDate` (optional): Filter records until this date (ISO format)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "pagination": {
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "_id": "record_id",
      "title": "Lab Results",
      "recordType": "Lab",
      "description": "Blood work results",
      "date": "2025-10-06T12:00:00.000Z",
      "fileUrl": "/uploads/medical-reports/filename.pdf",
      "status": "viewed",
      "patient": {...},
      "doctor": {...},
      "createdAt": "2025-10-06T12:00:00.000Z"
    }
  ]
}
```

### 3. Update Medical Record
**PUT** `/api/v1/records/patient/:id`

Update a medical record that belongs to the authenticated patient.

**Authentication:** Bearer token (patient role required)

**Parameters:**
- `id` (URL parameter): Medical record ID

**Request Body:**
```json
{
  "title": "Updated Lab Results",
  "description": "Updated description",
  "notes": "Additional notes",
  "recordType": "Lab"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "record_id",
    "title": "Updated Lab Results",
    "recordType": "Lab",
    "description": "Updated description",
    "notes": "Additional notes",
    "date": "2025-10-06T12:00:00.000Z",
    "fileUrl": "/uploads/medical-reports/filename.pdf",
    "status": "new",
    "patient": {...},
    "updatedAt": "2025-10-06T13:00:00.000Z"
  }
}
```

### 4. Delete Medical Record
**DELETE** `/api/v1/records/patient/:id`

Delete a medical record that belongs to the authenticated patient. This also deletes associated files.

**Authentication:** Bearer token (patient role required)

**Parameters:**
- `id` (URL parameter): Medical record ID

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

## File Access

Uploaded files can be accessed directly via:
`GET /uploads/medical-reports/filename`

**Note:** File access should be protected by proper authentication in production.

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common error codes:
- `400` - Bad Request (missing fields, invalid file type, file too large)
- `401` - Unauthorized (invalid token, wrong role)
- `404` - Not Found (record not found)
- `500` - Internal Server Error

## Usage Example

```javascript
// Upload a medical report
const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('title', 'Blood Test Results');
formData.append('recordType', 'Lab');
formData.append('description', 'Routine blood work');

const response = await fetch('/api/v1/records/patient/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

## Database Schema

The medical records are stored in the `medicalrecords` collection with the following schema:

```javascript
{
  patient: ObjectId (ref: Patient),
  doctor: ObjectId (ref: User),
  title: String (required),
  recordType: String (enum: ['Lab', 'Imaging', 'Prescription', 'Consultation', 'Surgery', 'Other']),
  date: Date (default: Date.now),
  description: String,
  fileUrl: String, // Single file or JSON array of multiple files
  status: String (enum: ['new', 'viewed'], default: 'new'),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```