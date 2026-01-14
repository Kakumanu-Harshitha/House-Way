# Houseway Platform - Complete Features & API Documentation

## Table of Contents

1. [Owner Features](#owner-features)
2. [Employee Features](#employee-features)
3. [Vendor Features](#vendor-features)
4. [Client Features](#client-features)
5. [Guest Features](#guest-features)
6. [Common Features](#common-features)

---

## Owner Features

### Dashboard & Overview

**APIs:**

- `GET /api/dashboard/owner-stats` - Get comprehensive owner statistics
- `GET /api/dashboard/recent-activity` - Get recent platform activities

**Features:**

- View total projects (planning, active, completed)
- View total users (employees, vendors, clients)
- View material requests and quotations statistics
- Monitor recent activities across platform

### User Management

**APIs:**

- `GET /api/users` - Get all users with filters (role, status, search)
- `GET /api/users/:id` - Get specific user details
- `PUT /api/users/:id/status` - Update user active/inactive status
- `PUT /api/users/:id/approve` - Approve user registration
- `POST /api/users` - Create new user (admin)
- `PUT /api/users/:id` - Update user details
- `DELETE /api/users/:id` - Delete user

**Features:**

- Approve/reject new user registrations
- Activate/deactivate users
- View all employees, vendors, clients
- Manage user roles and permissions

### Project Management

**APIs:**

- `GET /api/projects` - Get all projects with filters
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `PUT /api/projects/:id/status` - Update project status
- `POST /api/projects/:id/assign-employee` - Assign employee to project
- `POST /api/projects/:id/assign-vendor` - Assign vendor to project

**Features:**

- Create and manage all projects
- Assign employees and vendors to projects
- Monitor project status and progress
- Update budgets and timelines
- View project documents and media

### Finance Management

**APIs:**

- `GET /api/invoices/client` - Get all client invoices
- `GET /api/invoices/client/:id` - Get specific invoice
- `POST /api/invoices/client` - Create client invoice
- `PUT /api/invoices/client/:id` - Update invoice
- `PUT /api/invoices/client/:id/status` - Update invoice status
- `GET /api/purchase-orders` - Get all purchase orders
- `GET /api/purchase-orders/vendor/:vendorId` - Get vendor POs

**Features:**

- View receivables from clients
- View payables to vendors
- Generate and manage client invoices
- Track purchase orders
- Monitor payment schedules and installments
- View financial summaries and reports

### Material & Vendor Management

**APIs:**

- `GET /api/material-requests` - Get all material requests
- `GET /api/quotations` - Get all quotations
- `PUT /api/quotations/:id/approve` - Approve quotation
- `PUT /api/quotations/:id/reject` - Reject quotation
- `POST /api/purchase-orders` - Create purchase order

**Features:**

- View all material requests
- Review and approve/reject quotations
- Create purchase orders from approved quotations
- Monitor vendor performance

---

## Employee Features

### Common Employee Features

**APIs:**

- `POST /api/attendance/check-in` - Check in for the day
- `POST /api/attendance/check-out` - Check out
- `POST /api/attendance/heartbeat` - Send activity heartbeat
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/stats/:period` - Get attendance stats (daily/weekly/monthly)
- `GET /api/auth/profile` - Get own profile
- `PUT /api/auth/profile` - Update own profile

**Features:**

- Daily check-in/check-out
- Track working hours
- View attendance history
- Update personal profile

### Design Team (subRole: designTeam)

**APIs:**

- `GET /api/projects?assignedEmployee=:userId` - Get assigned projects
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `POST /api/files/upload` - Upload design files

**Features:**

- Client management (create, update, view)
- Project creation and design planning
- Upload design mockups and documents
- Manage client requirements
- Update project specifications

### Vendor Team (subRole: vendorTeam)

**APIs:**

- `GET /api/projects?assignedEmployee=:userId` - Get assigned projects
- `POST /api/material-requests` - Create material request
- `GET /api/material-requests` - View material requests
- `GET /api/quotations?materialRequest=:id` - Get quotations for request
- `PUT /api/quotations/:id/select` - Select vendor quotation
- `POST /api/purchase-orders` - Create purchase order
- `GET /api/work-status?materialRequest=:id` - Monitor vendor work

**Features:**

- Create material requests for projects
- Review vendor quotations
- Compare and select best quotations
- Create purchase orders
- Coordinate with vendors
- Monitor material delivery and work progress

### Execution Team (subRole: executionTeam)

**APIs:**

- `GET /api/projects?assignedEmployee=:userId` - Get assigned projects
- `POST /api/files/upload/invoice` - Upload client invoices
- `GET /api/files/invoices?projectId=:id` - View project invoices
- `DELETE /api/files/invoice/:id` - Delete invoice
- `POST /api/tasks` - Create tasks
- `GET /api/tasks?projectId=:id` - View project tasks
- `PUT /api/tasks/:id` - Update task

**Features:**

- Manage project execution
- Upload and manage client invoices
- Create and assign tasks
- Track project milestones
- Upload progress photos and documents

---

## Vendor Features

### Dashboard

**APIs:**

- `GET /api/dashboard/vendor-stats` - Get vendor statistics
- `GET /api/dashboard/recent-activity` - Get recent activities

**Features:**

- View pending material requests
- View sent quotations count
- View approved purchase orders
- View projects in progress

### Material Requests

**APIs:**

- `GET /api/material-requests` - Get all available material requests
- `GET /api/material-requests/:id` - Get request details

**Features:**

- Browse available material requests
- View request specifications
- Check project details

### Quotations

**APIs:**

- `POST /api/quotations` - Submit quotation
- `GET /api/quotations/my-quotations` - Get own quotations
- `GET /api/quotations/:id` - Get quotation details
- `PUT /api/quotations/:id` - Update quotation (if draft)
- `PUT /api/quotations/:id/submit` - Submit draft quotation

**Features:**

- Create detailed quotations
- Specify pricing and availability
- Set delivery terms
- Define payment terms
- Track quotation status (draft, submitted, approved, rejected)

### Purchase Orders

**APIs:**

- `GET /api/purchase-orders/my-orders` - Get own purchase orders
- `GET /api/purchase-orders/:id` - Get PO details
- `PUT /api/purchase-orders/:id/accept` - Accept purchase order
- `PUT /api/purchase-orders/:id/delivery-status` - Update delivery status

**Features:**

- View received purchase orders
- Accept/acknowledge orders
- Update delivery status
- Track payments

### Work Status Updates

**APIs:**

- `POST /api/work-status` - Create work status update
- `GET /api/work-status?quotation=:id` - Get status updates
- `PUT /api/work-status/:id` - Update work status

**Features:**

- Post progress updates
- Upload work photos
- Update completion percentage
- Communicate with project team

### Profile Management

**APIs:**

- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/upload-profile-photo` - Upload profile photo

**Features:**

- Update company details
- Manage specializations
- Update contact information
- Track rating and completed projects

---

## Client Features

### Dashboard

**APIs:**

- `GET /api/dashboard/client-stats` - Get client statistics
- `GET /api/projects?client=:userId` - Get own projects

**Features:**

- View all projects (planning, active, completed)
- View total material requests
- View pending payments
- View recent project updates

### Projects

**APIs:**

- `GET /api/projects?client=:userId` - Get own projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project (if allowed)

**Features:**

- View project details and progress
- Track project timeline
- View project budget and expenses
- Access project documents and photos

### Project Media

**APIs:**

- `GET /api/files?projectId=:id` - Get project files
- `GET /api/files/project/:projectId/images` - Get project images
- `GET /api/files/project/:projectId/documents` - Get documents

**Features:**

- View project photos
- Download project documents
- Access design files
- View progress updates

### Invoices & Payments

**APIs:**

- `GET /api/invoices/client/my-invoices` - Get own invoices
- `GET /api/invoices/client/project/:projectId` - Get project invoices
- `GET /api/invoices/client/:id` - Get invoice details

**Features:**

- View all invoices
- Track payment status
- View installment schedule
- Download invoice PDFs

### Timeline & Progress

**APIs:**

- `GET /api/projects/:id/timeline` - Get project timeline
- `GET /api/projects/:id/progress` - Get progress updates

**Features:**

- View project timeline
- Track milestones
- View completion stages
- Monitor delays

---

## Guest Features

### Browse Projects

**APIs:**

- `GET /api/projects?status=completed` - Browse completed projects (public)

**Features:**

- View showcase of completed projects
- Browse design gallery
- View platform capabilities

### Service Requests

**APIs:**

- `POST /api/service-requests` - Submit service inquiry
- `GET /api/service-requests/:id` - Check request status

**Features:**

- Submit project inquiry
- Request consultation
- Get estimated quotes

---

## Common Features (All Users)

### Authentication

**APIs:**

- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/request-password-otp` - Request password reset
- `POST /api/auth/verify-password-otp` - Verify OTP
- `POST /api/auth/reset-password-with-otp` - Reset password

**Features:**

- User registration (pending admin approval)
- Secure login/logout
- Password reset via OTP
- Session management

### Profile Management

**APIs:**

- `GET /api/auth/profile` - Get own profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/upload-profile-photo` - Upload photo
- `DELETE /api/auth/remove-profile-photo` - Remove photo

**Features:**

- Update personal information
- Change password
- Upload profile picture
- Manage contact details

### Notifications

**APIs:**

- `GET /api/dashboard/recent-activity` - Get notifications/activities

**Features:**

- View recent activities
- Get update notifications
- Track important events

### File Management

**APIs:**

- `POST /api/files/upload` - Upload file
- `GET /api/files` - Get files with filters
- `GET /api/files/:id` - Get file details
- `DELETE /api/files/:id` - Delete file

**Features:**

- Upload documents
- Upload images
- Download files
- Delete own uploads

---

## API Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

---

## Authentication Headers

All authenticated API requests require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Common Query Parameters

### Filtering

- `?status=active` - Filter by status
- `?role=vendor` - Filter by role
- `?search=keyword` - Search by keyword

### Pagination

- `?page=1` - Page number
- `?limit=20` - Items per page

### Sorting

- `?sort=createdAt` - Sort field
- `?order=desc` - Sort order (asc/desc)

---

## File Upload Endpoints

### Upload Categories

- `documents` - PDF, DOC, DOCX, TXT
- `images` - JPG, JPEG, PNG, GIF
- `quotations` - Quotation files
- `purchase-orders` - PO documents
- `invoices` - Invoice files
- `work_update` - Progress photos/docs

### Size Limits

- Images: 5 MB
- Documents: 10 MB
- Videos: 50 MB

---

## Status Enumerations

### Project Status

- `planning` - Initial planning stage
- `in-progress` - Active project
- `on-hold` - Temporarily paused
- `completed` - Finished
- `cancelled` - Terminated

### Material Request Status

- `pending` - Awaiting review
- `approved` - Approved, vendors can quote
- `in-negotiation` - Vendor quotations being reviewed
- `ordered` - Purchase order created
- `completed` - Materials delivered
- `cancelled` - Request cancelled

### Quotation Status

- `draft` - Being prepared by vendor
- `submitted` - Submitted for review
- `under-review` - Being evaluated
- `approved` - Accepted and PO created
- `rejected` - Not selected
- `expired` - Validity period passed

### Invoice Status

- `draft` - Being prepared
- `sent` - Sent to client
- `viewed` - Client viewed invoice
- `paid` - Payment received
- `overdue` - Past due date
- `cancelled` - Invoice cancelled

### Purchase Order Status

- `draft` - Being prepared
- `pending-approval` - Awaiting approval
- `approved` - Approved and sent to vendor
- `in-progress` - Vendor working on order
- `completed` - Order fulfilled
- `cancelled` - Order cancelled

---

## Rate Limits

- Authentication: 5 requests per minute
- File uploads: 10 uploads per hour
- API calls: 100 requests per minute
- Bulk operations: 20 requests per minute

---

## Error Codes

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Unauthorized access
- `VAL_001` - Validation error
- `VAL_002` - Missing required field
- `DB_001` - Database error
- `FILE_001` - File upload error
- `FILE_002` - File size exceeded
- `PERM_001` - Insufficient permissions

---

_Last Updated: December 28, 2025_
