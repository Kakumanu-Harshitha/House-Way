# API Documentation

This document provides detailed information about the API endpoints used by the Houseway mobile application.

## Base Configuration

```javascript
// Base URL Configuration
const BASE_URL = 'http://localhost:5000/api';

// Authentication Header
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "role": "client",
      "isActive": true
    }
  }
}
```

### Register Client
```http
POST /api/auth/register-client
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345"
  }
}
```

### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

## Projects Endpoints

### Get Projects
```http
GET /api/projects?client=<client_id>&status=<status>&limit=<limit>
Authorization: Bearer <token>
```

**Query Parameters:**
- `client` (optional): Filter by client ID
- `assignedTo` (optional): Filter by assigned employee ID
- `status` (optional): Filter by project status
- `limit` (optional): Limit number of results

### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Modern House Design",
  "description": "3-bedroom modern house with open floor plan",
  "projectType": "residential",
  "designStyle": "modern",
  "priority": "medium",
  "client": "client_id",
  "budget": {
    "estimated": 150000,
    "currency": "USD"
  },
  "timeline": {
    "startDate": "2024-01-15",
    "expectedEndDate": "2024-06-15"
  },
  "location": {
    "address": "123 Project St",
    "city": "Design City",
    "state": "CA",
    "zipCode": "12345"
  },
  "specifications": {
    "area": 2500,
    "areaUnit": "sqft",
    "floors": 2,
    "bedrooms": 3,
    "bathrooms": 2,
    "parking": 2
  }
}
```

### Update Project
```http
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in-progress",
  "progress": {
    "percentage": 45,
    "milestones": [
      {
        "name": "Foundation Complete",
        "completed": true,
        "completedDate": "2024-02-01"
      }
    ]
  }
}
```

## Material Requests Endpoints

### Get Material Requests
```http
GET /api/material-requests?project=<project_id>&status=<status>
Authorization: Bearer <token>
```

### Create Material Request
```http
POST /api/material-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "project": "project_id",
  "description": "Materials needed for foundation work",
  "priority": "high",
  "requiredBy": "2024-02-15",
  "items": [
    {
      "name": "Concrete Mix",
      "description": "High-strength concrete for foundation",
      "quantity": 50,
      "unit": "bags",
      "estimatedCost": 25.00
    },
    {
      "name": "Rebar",
      "description": "#4 rebar for reinforcement",
      "quantity": 100,
      "unit": "pieces",
      "estimatedCost": 8.50
    }
  ]
}
```

### Approve Material Request
```http
PUT /api/material-requests/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "comments": "Approved for immediate procurement"
}
```

## Quotations Endpoints

### Get Quotations
```http
GET /api/quotations?vendor=<vendor_id>&status=<status>
Authorization: Bearer <token>
```

### Create Quotation
```http
POST /api/quotations
Authorization: Bearer <token>
Content-Type: application/json

{
  "materialRequest": "material_request_id",
  "vendor": "vendor_id",
  "validUntil": "2024-03-01",
  "items": [
    {
      "materialRequestItem": "item_id",
      "unitPrice": 25.00,
      "quantity": 50,
      "totalPrice": 1250.00,
      "notes": "Bulk discount applied"
    }
  ],
  "totalAmount": 2100.00,
  "notes": "Delivery included in price",
  "terms": "Payment due within 30 days"
}
```

### Approve Quotation
```http
PUT /api/quotations/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "comments": "Best price and quality",
  "rating": 5
}
```

## Files Endpoints

### Get Files
```http
GET /api/files?project=<project_id>&category=<category>
Authorization: Bearer <token>
```

### Upload File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- file: <file_data>
- project: <project_id>
- category: <category>
- description: <description>
```

### Download File
```http
GET /api/files/:id/download
Authorization: Bearer <token>
```

## Dashboard Endpoints

### Get Dashboard Stats
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProjects": 25,
    "activeProjects": 12,
    "completedProjects": 8,
    "pendingRequests": 5,
    "totalRevenue": 250000,
    "recentActivity": [...]
  }
}
```

### Get Role-Specific Stats
```http
GET /api/dashboard/client-stats
GET /api/dashboard/employee-stats
GET /api/dashboard/vendor-stats
GET /api/dashboard/owner-stats
Authorization: Bearer <token>
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **General endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user

## Pagination

For endpoints that return lists, pagination is supported:

```http
GET /api/projects?page=1&limit=20&sort=createdAt&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## WebSocket Events

For real-time updates:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000', {
  auth: {
    token: jwt_token
  }
});

// Listen for project updates
socket.on('project:updated', (data) => {
  console.log('Project updated:', data);
});

// Listen for new material requests
socket.on('material-request:created', (data) => {
  console.log('New material request:', data);
});
```
