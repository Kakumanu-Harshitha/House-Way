# Houseway: User Roles + End-to-End Flows (code-derived)

This document describes what each user role does and how the major flows work, based strictly on the repository’s **backend routes/models** and the **mobile app screens/API clients**.

Constraints followed:

- Describes behavior and data/state changes.
- References screens/endpoints/status fields.
- Does **not** paste code.

---

## 1) Roles, identity, and how the app decides “who you are”

### Roles in the system

The backend `User` model and auth/authorization logic use these roles:

- **owner**
- **employee** (has `subRole`)
- **vendor**
- **client**
- **guest**

Employee `subRole` values used for access filtering:

- `designTeam`
- `vendorTeam`
- `executionTeam`
- `none`

### Authentication and session behavior

Backend endpoints:

- Register: `POST /api/auth/register` (defaults role to `guest` if not provided; requires `subRole` if role=`employee`)
- Login: `POST /api/auth/login`
- Profile: `GET /api/auth/profile`

Mobile behavior (session persistence):

- On login/register success, the mobile app stores:
  - `@houseway_token` (JWT)
  - `@houseway_user` (user object)
- Navigation is chosen strictly by `user.role`.

Important nuance (approval flag):

- During employee self-registration, backend sets `approvedByAdmin=false`, but current login/auth middleware does **not** block unapproved employees.

### Role-based navigation (mobile)

Mobile `RoleBasedNavigator` selects one of:

- Owner navigator
- Employee navigator
- Vendor navigator
- Client navigator
- Guest navigator

Notable:

- The **Negotiation Chat** screen exists as a shared screen reachable by Owner and Vendor flows.
- Some Employee flows include placeholder screens (rendering nothing) even though backend endpoints exist.

---

## 2) Core entities and “status fields” that drive workflows

### Project

Primary fields used in flows:

- `status` (commonly used values: `planning`, `in-progress`, `on-hold`, `completed`, `cancelled`)
- `assignedEmployees[]`, `assignedVendors[]`, `client`
- `progress.percentage` and `progress.milestones`
- `documents[]` and `images[]` (uploaded to server storage via `/projects/:id/upload-*` endpoints)

### Client timeline + media (client-facing)

Two collections:

- `ClientTimelineEvent` (timeline entries)
- `ClientMedia` (gallery entries)

Visibility controls:

- Timeline events include `visibility`.
- Media includes `isPublic` (clients only see public media in client self-service endpoints).

### MaterialRequest

Drives vendor assignment/acceptance and creates purchase orders.

### PurchaseOrder + NegotiationMessage (the implemented “quotation flow”)

PurchaseOrder status enum includes:

- `draft`, `sent`, `acknowledged`, `in_negotiation`, `accepted`, `rejected`, `in_progress`, `partially_delivered`, `completed`, `cancelled`

Negotiation chat message types:

- `text`, `quotation`, `invoice`, `system`, `delivery`

Key gating flag:

- `purchaseOrder.negotiation.chatClosed` blocks new chat messages and quotation submission.

### VendorInvoice

Created by the backend during the **delivery details submission** step in the purchase-order flow.

### ClientInvoice

Created by Owner/Employee; generates a PDF and stores it as a `File` record.

### File (general uploads)

Used widely for:

- Project “files gallery” shown in some mobile screens
- Vendor Work Status attachments
- Invoice image uploads

This is distinct from `Project.images/documents` and from `ClientMedia`.

---

## 3) What each role can do (micro-operation level)

This section describes **typical** actions and the exact backend entry points that enable them.

### Owner

**User management**

- Create employees/vendors via owner-only registration routes:
  - `POST /api/auth/register-employee`
  - `POST /api/auth/register-vendor`
- View/filter users: `GET /api/users` (Owner or Employee)
- Activate/deactivate users: `PUT /api/users/:id/status` (Owner only)
- Soft-delete users: `DELETE /api/users/:id` (Owner only)
- Upload profile photo (GCS-based users route): `POST /api/users/profile-photo` (any logged-in user)

**Client management**

- List/search clients: `GET /api/clients` (Owner/Employee)
- View a client profile + summary (projects, recent timeline/media, invoice stats): `GET /api/clients/:id` (Owner/Employee)
- Update client details/status fields: `PUT /api/clients/:id` (Owner/Employee)
- Employee/Owner can register a new client account (separate from public auth registration): `POST /api/users/register-client`

**Projects**

- List all projects: `GET /api/projects`
- Create project: `POST /api/projects` (Owner or Employee allowed by route)
- Update project fields: `PUT /api/projects/:id` (Owner or Employee)
- Cancel project: `DELETE /api/projects/:id` (Owner only; sets status `cancelled`)
- Assign people:
  - Assign employee: `PUT /api/projects/:id/assign-employee`
  - Assign vendor: `PUT /api/projects/:id/assign-vendor`
- Update progress: `PUT /api/projects/:id/progress`
- Add timeline event: `POST /api/projects/:id/timeline`
- Upload client-visible project media to GCS: `POST /api/projects/:id/media`
- Upload project documents/images into Project model:
  - `POST /api/projects/:id/upload-documents`
  - `POST /api/projects/:id/upload-images`

**Files (general uploads, stored as `File` records)**

- Upload any supported file type to GCS and create a `File` record: `POST /api/files/upload`
  - Optional: attach to a project using `projectId`
  - Uses `category` to choose a GCS folder (allowed set enforced server-side)
- Upload an invoice image to GCS and create a `File` record: `POST /api/files/upload/invoice`
- Fetch invoice image records (and signed URLs) for a project: `GET /api/files/invoices?projectId=...`

**Material requests and purchase-order negotiation**

- Full material request lifecycle (Owner/Employee endpoints) via `/api/material-requests/...`.
- Purchase order lifecycle & chat:
  - Create/send from draft: `PUT /api/purchase-orders/:id/send`
  - Vendor acknowledgement: `PUT /api/purchase-orders/:id/acknowledge`
  - Accept/reject vendor quotation messages:
    - `PUT /api/purchase-orders/:id/quotation/:messageId/accept`
    - `PUT /api/purchase-orders/:id/quotation/:messageId/reject`
  - Read messages: `GET /api/purchase-orders/:id/messages`

**Invoices**

- Client invoices via `/api/invoices/...` and `/api/projects/:id/invoices`.
- Vendor invoices (view all): `GET /api/vendor-invoices` and detail/download.

**Dashboards**

- System stats: `GET /api/dashboard/stats`
- Owner overview: `GET /api/dashboard/owner-stats` and `GET /api/dashboard/admin-overview`
- Recent activity feed: `GET /api/dashboard/recent-activity`

**Service requests (support / maintenance / ad-hoc work)**

- View all: `GET /api/service-requests` (role-filtered in model)
- Assign a vendor to a request: `PUT /api/service-requests/:id/assign` (Owner only)
- Update status: `PUT /api/service-requests/:id/status` (Owner/requester/assigned vendor)
- Post communication message: `POST /api/service-requests/:id/communication` (Owner/requester/assigned vendor)

**Attendance**

- Owner can view other users’ attendance via attendance routes (in addition to self operations).

---

### Employee (subRole-based behavior)

There are two layers:

- Backend role checks: many endpoints are simply `authorize('owner','employee')`.
- Project scoping: some listings filter projects/material requests by assignment and/or subRole.

**Project access differences (list view)**
`GET /api/projects` applies employee subRole filtering:

- `vendorTeam`: sees projects where `assignedVendors` contains the employee’s user id.
- `designTeam`: sees projects they created OR are assigned to.
- other employees: sees assigned projects OR created projects.

**Typical employee operations**

- Create/update projects (same endpoints as owner): `POST /api/projects`, `PUT /api/projects/:id`
- Add project timeline events (must be assigned to project): `POST /api/projects/:id/timeline`
- Upload client-visible media to GCS (must be assigned): `POST /api/projects/:id/media`
- Upload project images/documents into the Project record:
  - `POST /api/projects/:id/upload-images` (must be assigned)
  - `POST /api/projects/:id/upload-documents` (client can also upload docs; employees/owners can too)

**Client operations (employee-facing)**

- List/search clients: `GET /api/clients`
- View/update client: `GET /api/clients/:id`, `PUT /api/clients/:id`
- Register a new client account: `POST /api/users/register-client`

**Tasks (project task list / reminders)**

- Create task: `POST /api/tasks` (requires `projectId`)
- View tasks for a project: `GET /api/tasks/project/:projectId`
- View upcoming tasks: `GET /api/tasks/upcoming`
- Update/delete tasks: `PUT /api/tasks/:taskId`, `DELETE /api/tasks/:taskId`
- Update only status: `PUT /api/tasks/:taskId/status`

Mobile note:

- The “Executive” screens actively use timeline/progress/vendor assignment features.
- Some employee navigator screens for timeline/media are placeholders (UI gaps may exist even when API supports it).

---

### Vendor

**Assigned work intake**

- Material requests available to vendor and acceptance:
  - List material requests (role-filtered): `GET /api/material-requests`
  - Accept a material request (creates a PurchaseOrder): `POST /api/material-requests/:id/accept`

**Purchase order negotiation (chat)**

- List your purchase orders: `GET /api/purchase-orders` (vendor-scoped)
- Fetch a single purchase order: `GET /api/purchase-orders/:id` (must pass access checks)
- Acknowledge an order: `PUT /api/purchase-orders/:id/acknowledge` (only when status=`sent`)
- Read/send messages:
  - `GET /api/purchase-orders/:id/messages`
  - `POST /api/purchase-orders/:id/messages` (blocked if `negotiation.chatClosed=true`)
- Submit quotation into chat:
  - `POST /api/purchase-orders/:id/quotation` (blocked if chat closed or already accepted)
  - Side effect: purchase order status becomes `in_negotiation`.

**After owner accepts a quotation**
Vendor must submit delivery details:

- `POST /api/purchase-orders/:id/delivery-details`
  - Preconditions: PO status=`accepted` and accepted quotation exists
  - Side effects (backend):
    - Creates a `delivery` chat message
    - Creates a `VendorInvoice`
    - Adds an `invoice` chat message
    - Sets `negotiation.chatClosed=true`
    - Sets PO status to `in_progress`

**Delivery tracking updates**

- `PUT /api/purchase-orders/:id/delivery-status`
  - Updates `deliveryTracking`.
  - If status=`delivered`, PO becomes `completed`.
  - If status=`partially_delivered`, PO becomes `partially_delivered`.
- `GET /api/purchase-orders/:id/delivery-tracking` (vendor-scoped)

**Vendor invoices**

- List own invoices: `GET /api/vendor-invoices/my-invoices`
- View invoice: `GET /api/vendor-invoices/:id`
- Download/stream PDF:
  - `GET /api/vendor-invoices/:id/download`
  - `GET /api/vendor-invoices/:id/pdf`

**Dashboards**

- Vendor stats: `GET /api/dashboard/vendor-stats`
- Vendor overview (orders + invoices summary): `GET /api/dashboard/vendor-overview`

**Work status (separate from delivery tracking)**

- Create a work status update (requires an **approved** legacy `Quotation`): `POST /api/work-status`
- List work status updates:
  - Vendor sees only their own: `GET /api/work-status`
  - Others can query by `quotationId`, `materialRequestId`, `vendorId`
- Update an existing work status: `PUT /api/work-status/:id` (vendor can only update their own)

---

### Client

Clients primarily consume project updates and create service requests.

**Projects (self-service)**
Clients can fetch their own projects via two patterns:

- Role-filtered generic projects endpoint:
  - `GET /api/projects` (backend limits client to projects where `client=req.user._id`)
- Explicit client self-service endpoints:
  - `GET /api/clients/me/projects`
  - `GET /api/clients/me/projects/:projectId` (returns project + media + invoices + timeline)
  - `GET /api/clients/me/projects/:projectId/media` (public media only)
  - `GET /api/clients/me/projects/:projectId/documents`

**Timeline and media (read-only for client in most flows)**

- Timeline (project-scoped): `GET /api/projects/:id/timeline` (allowed when project belongs to client)
- Media (project-scoped): `GET /api/projects/:id/media` (allowed when project belongs to client)

**Project documents upload (client allowed)**

- Client can upload project documents: `POST /api/projects/:id/upload-documents` (requires project ownership)

**Service requests**

- Create and track service requests via `/api/service-requests/...`.

Client micro-ops supported by routes:

- Create a request: `POST /api/service-requests`
- View their requests list: `GET /api/service-requests` (filtered by model helper)
- View a request (if requester): `GET /api/service-requests/:id`
- Update request status (if requester): `PUT /api/service-requests/:id/status`
- Post messages in the request thread (if requester): `POST /api/service-requests/:id/communication`

---

### Guest

- Can register/login as a guest.
- Most operational endpoints require authentication and will not authorize a guest for project/vendor/client workflows.

---

## 4) End-to-end flows (micro steps)

Each flow is written as: **Actor → UI action → API call(s) → backend rules/side effects → resulting state**.

### Flow A — Project creation + assignment + execution tracking

**Owner/Employee creates a project**

1. Actor: Owner or Employee
2. UI: Create project form
3. API: `POST /api/projects`
4. Backend rules:
   - `clientId` must exist and be a user with role `client`.
   - `assignedEmployees` (if provided) must be active employees.
   - `assignedVendors` (if provided) must be active vendors.
5. State:
   - New `Project` saved with `createdBy=req.user._id`.

**Assigning team members**

1. Actor: Owner/Employee
2. UI: assign employee/vendor
3. APIs:
   - `PUT /api/projects/:id/assign-employee`
   - `PUT /api/projects/:id/assign-vendor`
4. Backend rules nuance:
   - `assign-vendor` accepts either:
     - a user with role `vendor`, OR
     - a user with role `employee` and `subRole='vendorTeam'`
5. State:
   - Project arrays updated.

**Progress updates**

1. Actor: Owner/Employee (must be assigned if employee)
2. UI: progress update modal
3. API: `PUT /api/projects/:id/progress`
4. State:
   - `progress.percentage` and/or milestones updated.

---

### Flow B — Project timeline (client-visible milestones)

**Add a timeline event**

1. Actor: Owner or Employee
2. UI: add milestone/update step
3. API: `POST /api/projects/:id/timeline`
4. Backend rules:
   - Employees must be assigned to the project to add events.
   - Event includes `eventType`, `title`, `description`, optional `startDate/endDate`, plus `visibility`.
5. State:

   - New `ClientTimelineEvent` created with `clientId` and `projectId`.

**Client views timeline**

1. Actor: Client
2. UI: timeline screens in project details
3. API: `GET /api/projects/:id/timeline` or `GET /api/clients/me/projects/:projectId`
4. Backend rules:
   - Client must own the project.

---

### Flow C — Project media (two parallel systems)

There are **two** distinct “media” mechanisms in the backend, plus a third “files” mechanism.

#### C1) Client-visible gallery media in `ClientMedia` (GCS)

**Upload gallery media**

1. Actor: Owner or Employee
2. UI: media upload (if implemented)
3. API: `POST /api/projects/:id/media`
4. Backend rules:
   - Employees must be assigned to the project.
   - Upload is limited by file count; only image/video mime types are accepted.
5. State:
   - Files are uploaded to GCS under a `project-media` folder.
   - `ClientMedia` entries are created with `isPublic` (default true-like) and `uploadedBy`.

**Client views gallery media**

1. Actor: Client
2. UI: project media/gallery
3. API:
   - `GET /api/projects/:id/media` (client allowed if project belongs)
   - OR `GET /api/clients/me/projects/:projectId/media` (always public-only)
4. State:
   - No mutation; returns media entries.

#### C2) “Project images/documents” stored inside `Project` (server uploads)

This is a simpler mechanism storing URL references directly in the `Project` document.

- Upload documents (owner/employee/client with access): `POST /api/projects/:id/upload-documents`
- Upload images (owner/employee with access): `POST /api/projects/:id/upload-images`

These URLs are generated by server-side `getFileUrl(...)` and point to server-hosted upload paths.

#### C3) General `File` uploads (GCS) used by many mobile screens

Some mobile screens show “project files” by calling `filesAPI.getProjectFiles(projectId)` and upload via `POST /api/files/upload`.

This system stores entries in the `File` collection and is separate from `ClientMedia`.

---

### Flow D — Material Request → Vendor accept → Purchase Order negotiation chat → Vendor invoice

This is the most important operational chain and is the **implemented quotation flow**.

#### D1) Material request created and approved/assigned

1. Actor: Owner/Employee
2. UI: create material request and assign vendors
3. API: `POST /api/material-requests` (plus updates/approval endpoints in material requests routes)
4. State:
   - MaterialRequest status transitions, and a list of assigned vendors is set.

#### D2) Vendor accepts material request (creates Purchase Order)

1. Actor: Vendor
2. UI: “Accept request”
3. API: `POST /api/material-requests/:id/accept`
4. Backend rules:
   - Material request must be approved and vendor must be assigned.
5. State:
   - Creates a `PurchaseOrder` with status `sent` and negotiation metadata.

#### D3) Negotiation chat: messaging and quotation submission

1. Actor: Vendor and Owner
2. UI: NegotiationChat screen
3. APIs:
   - List purchase orders:
     - `GET /api/purchase-orders` (role-filtered)
     - `GET /api/purchase-orders/project/:projectId` (project-scoped listing)
   - Load order: `GET /api/purchase-orders/:id`
   - Load messages: `GET /api/purchase-orders/:id/messages`
   - Mark read: `PUT /api/purchase-orders/:id/mark-read`
   - Send message: `POST /api/purchase-orders/:id/messages`
   - Vendor submit quotation: `POST /api/purchase-orders/:id/quotation`
4. Backend rules:
   - If `negotiation.chatClosed=true`, message/quotation submission is blocked.
   - Purchase order access is role-checked:
     - Owner: always allowed
     - Vendor: only if `purchaseOrder.vendor == req.user._id`
     - Employee: only if the purchase order’s project includes them as an assigned employee
     - Client: only if the purchase order’s project belongs to them
5. State:
   - Quotation message saved as a `NegotiationMessage` with type `quotation`.
   - PurchaseOrder status becomes `in_negotiation`.

Socket behavior (as used by mobile):

- Client joins room via `joinOrder` and receives events like `newMessage`, `quotationSubmitted`, `quotationAccepted`, `quotationRejected`, `orderUpdated`, `userTyping`.

#### D4) Owner accepts or rejects a quotation

**Accept**

1. Actor: Owner
2. UI: accept quotation action in chat
3. API: `PUT /api/purchase-orders/:id/quotation/:messageId/accept`
4. State:
   - Quotation status on that message becomes `accepted`.
   - PO status becomes `accepted`.
   - System messages are created prompting vendor to submit delivery details.
   - Chat remains open at this stage.

**Reject**

1. Actor: Owner
2. UI: reject quotation with reason
3. API: `PUT /api/purchase-orders/:id/quotation/:messageId/reject`
4. State:
   - Quotation status becomes `rejected`.
   - PO returns to `in_negotiation`.

#### D5) Vendor submits delivery details (invoice generation + chat closure)

1. Actor: Vendor
2. UI: submit delivery details in chat (or delivery screen)
3. API: `POST /api/purchase-orders/:id/delivery-details`
4. Backend rules:
   - Only allowed when PO status=`accepted`.
5. State:
   - A `VendorInvoice` is created.
   - An `invoice` chat message is inserted.
   - `negotiation.chatClosed=true`.
   - PO status becomes `in_progress`.

#### D6) Vendor updates delivery status (tracking + completion)

1. Actor: Vendor
2. UI: update delivery tracking
3. API: `PUT /api/purchase-orders/:id/delivery-status`
4. State:
   - Updates `deliveryTracking`.
   - If delivered: PO status becomes `completed`.

---

### Flow E — Client invoice (owner/employee billing to client)

Two entry points exist:

- `POST /api/projects/:id/invoices` (project-scoped create)
- `/api/invoices/...` routes (general invoice operations)

The flow:

1. Actor: Owner/Employee
2. UI: Create invoice screen
3. API: invoice creation endpoint
4. State:
   - PDF is generated and stored (GCS), and a `File` record is created.
   - `ClientInvoice` record references the stored file.

---

### Flow F — General file uploads (project documents, work updates, invoice images)

This flow is used by several mobile screens that call `filesAPI.*`.

**Upload a file to GCS and associate it to a project**

1. Actor: Any authenticated user (role-dependent UI)
2. UI: file picker / image picker
3. API: `POST /api/files/upload`
4. Backend rules:
   - Accepts a single `file` field.
   - Enforces an allowed `category` set; defaults to `documents`.
   - Optional `projectId` attaches the file to a project.
5. State:
   - Uploads to GCS and saves a `File` record with `uploadedBy` and optional `project`.

**Upload an invoice image**

1. Actor: Authenticated user
2. API: `POST /api/files/upload/invoice`
3. State:
   - Stores under the `invoices` folder/category and returns an `attachment` payload.

**Fetch invoice images for a project**

1. Actor: Authenticated user
2. API: `GET /api/files/invoices?projectId=...`
3. State:
   - Returns invoice `File` records and signed URLs for access.

---

### Flow G — Service request (request → assignment → communication → status)

**Create a service request**

1. Actor: Any authenticated user
2. UI: client profile “Service Requests” create screen
3. API: `POST /api/service-requests`
4. State:
   - Creates `ServiceRequest` with `requestedBy=req.user._id`.

**Owner assigns a vendor**

1. Actor: Owner
2. UI: assign vendor
3. API: `PUT /api/service-requests/:id/assign`
4. Backend rules:
   - `vendorId` must exist and have role `vendor`.
5. State:
   - Sets `assignedVendor` and updates status to `assigned`.

**Requester/vendor/owner communicates**

1. Actor: Owner or requester or assigned vendor
2. UI: add message
3. API: `POST /api/service-requests/:id/communication`
4. State:
   - Appends to `communication[]` with sender and internal/public flag.

**Status changes**

1. Actor: Owner or requester or assigned vendor
2. UI: update status
3. API: `PUT /api/service-requests/:id/status`
4. State:
   - Calls model status transition helper (`updateStatus`).

---

### Flow H — Task lifecycle (create → assign → complete)

**Create a task**

1. Actor: Any authenticated user (no explicit role check in routes)
2. UI: create task
3. API: `POST /api/tasks`
4. Backend rules:
   - `projectId` must exist.
5. State:
   - Task saved with `createdBy=req.user._id` and optional `assignedTo`.

**Update task status**

1. Actor: Any authenticated user
2. API: `PUT /api/tasks/:taskId/status`
3. Backend rules:
   - Allowed statuses: `pending`, `in-progress`, `completed`, `cancelled`.
4. State:
   - If status becomes `completed`, sets `completedAt`.

### Flow I — Attendance (employee daily ops)

Employee UI patterns often force check-in before allowing work screens, but backend enforcement is route-based (auth/role).

Typical operations:

- Check-in: `POST /api/attendance/check-in`
- Heartbeat: `POST /api/attendance/heartbeat` (hourly)
- Check-out: `POST /api/attendance/check-out`
- View status/stats: `GET /api/attendance/...`

---

### Flow J — Vendor work status (legacy quotation–based updates)

This is separate from purchase-order delivery tracking. It attaches progress updates to **approved** legacy `Quotation` records.

**Vendor creates a work status update**

1. Actor: Vendor
2. UI: “Upload Work Status” screen (vendor flow)
3. APIs:
   - Upload attachments first: `POST /api/files/upload` (returns `File` ids)
   - Create work status: `POST /api/work-status`
4. Backend rules:
   - `quotationId`, `materialRequestId`, and `message` are required.
   - The `Quotation` must belong to the vendor and have `status='approved'`.
5. State:
   - Creates a `WorkStatus` document with `attachments[]` referencing `File` records.
   - Emits `workStatusUpdated` socket event.

---

## 5) Known inconsistencies / “gotchas” (from code)

- PurchaseOrder status naming inconsistency:
  - Dashboard owner-stats counts `PurchaseOrder.countDocuments({ status: 'pending' })`, but the PurchaseOrder status enum does not include `pending`.
- Multiple upload systems:
  - `ClientMedia` (GCS, client gallery), `Project.images/documents` (server upload paths), and `File` (GCS, generic files) are different.
- Employee approval flag:
  - `approvedByAdmin` is set for employee self-registration, but current auth middleware does not enforce it.

---

## 6) Primary sources (files used to derive this doc)

Backend (routes/models/controllers):

- `backend/src/routes/auth.js`
- `backend/src/controllers/authController.js`
- `backend/src/middleware/auth.js`
- `backend/src/routes/users.js`
- `backend/src/routes/projects.js`
- `backend/src/routes/clients.js`
- `backend/src/routes/materialRequests.js`
- `backend/src/routes/purchaseOrders.js`
- `backend/src/models/PurchaseOrder.js`
- `backend/src/models/NegotiationMessage.js`
- `backend/src/routes/vendorInvoices.js`
- `backend/src/routes/invoices.js`
- `backend/src/routes/serviceRequests.js`
- `backend/src/routes/attendance.js`
- `backend/src/routes/tasks.js`
- `backend/src/routes/workStatus.js`
- `backend/src/routes/dashboard.js`

Mobile (navigation/screens/API clients):

- `mobile-app/src/context/AuthContext.js`
- `mobile-app/src/navigation/RoleBasedNavigator.js` (+ per-role navigators)
- `mobile-app/src/utils/api.js`
- `mobile-app/src/services/ordersAPI.js`
- `mobile-app/src/screens/shared/NegotiationChatScreen.js`
- `mobile-app/src/screens/client/projects/ProjectDetailsScreen.js`
- `mobile-app/src/screens/client/projects/TimelineScreen.js`
- `mobile-app/src/screens/executive/ExecutiveProjectDetailScreen.js`
