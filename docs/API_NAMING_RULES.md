# API Naming Rules

This document defines the API naming conventions that **MUST** be followed for all endpoints in this project.

## Core Principles

### 1. Use Plural Nouns for Resources

All resource endpoints use **plural nouns**:
- ✅ `/boards` - not `/board`
- ✅ `/tasks` - not `/task`
- ✅ `/designs` - not `/design`
- ✅ `/contents` - not `/content`
- ✅ `/files` - not `/file`
- ✅ `/comments` - not `/comment`
- ✅ `/activity-logs` - not `/activity-log` or `/activitylog`

### 2. No Verbs in URLs

**NEVER** use verbs in endpoint paths. Use HTTP methods to express actions.

❌ **BAD Examples:**
- `/tasks/:id/move`
- `/designs/:id/approve`
- `/designs/:id/reject`
- `/users/:id/activate`
- `/boards/:id/assign`

✅ **GOOD Examples:**
- `PATCH /tasks/:id` (with body: `{ column: "DONE" }`) - for moving tasks
- `PATCH /designs/:id` (with body: `{ status: "APPROVED" }`) - for approving
- `PATCH /designs/:id` (with body: `{ status: "REJECTED", rejectReason: "..." }`) - for rejecting
- `PATCH /users/:id` (with body: `{ status: "ACTIVE" }`) - for activating

### 3. Use HTTP Methods to Express Actions

- **GET** - List resources or get a single resource
  - `GET /boards` - List all boards
  - `GET /boards/:id` - Get a single board
  - `GET /boards/:boardId/tasks` - List tasks for a board

- **POST** - Create a new resource
  - `POST /boards` - Create a new board
  - `POST /boards/:boardId/tasks` - Create a task in a board

- **PATCH** - Partial update (including state changes like approve/reject/move)
  - `PATCH /tasks/:id` - Update task (including column change for drag-drop)
  - `PATCH /designs/:id` - Update design (including status: APPROVED/REJECTED)
  - `PATCH /roles/:id` - Update role (including permissions)

- **DELETE** - Soft delete (set deletedAt timestamp)
  - `DELETE /boards/:id` - Soft delete a board
  - `DELETE /tasks/:id` - Soft delete a task

### 4. Parent-Child Context Routes

For resources with parent-child relationships:

**List/Create use nested routes:**
- ✅ `GET /boards/:boardId/tasks` - List tasks in a board
- ✅ `POST /boards/:boardId/tasks` - Create a task in a board
- ✅ `GET /boards/:boardId/designs` - List designs in a board
- ✅ `POST /boards/:boardId/designs` - Create a design in a board

**Update/Delete use top-level routes:**
- ✅ `PATCH /tasks/:id` - Update a task (regardless of which board it's in)
- ✅ `DELETE /tasks/:id` - Delete a task
- ✅ `PATCH /designs/:id` - Update a design
- ✅ `DELETE /designs/:id` - Delete a design

### 5. Filtering and Pagination

**Always** use query parameters for filtering and pagination:

- ✅ `GET /boards?status=ACTIVE&page=1&limit=10`
- ✅ `GET /tasks?boardId=xxx&column=NEW_IDEA&page=1`
- ✅ `GET /designs?boardId=xxx&status=PENDING`
- ✅ `GET /users?roleId=xxx&teamId=yyy&page=2&limit=20`

**Query parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- Resource-specific filters (e.g., `status`, `boardId`, `column`, etc.)

## Examples

### Boards

```
GET    /boards                    # List all boards
GET    /boards/:id                # Get board by ID
POST   /boards                    # Create new board
PATCH  /boards/:id                # Update board
DELETE /boards/:id                # Soft delete board
GET    /boards/:boardId/tasks     # List tasks in board
POST   /boards/:boardId/tasks     # Create task in board
GET    /boards/:boardId/designs   # List designs in board
POST   /boards/:boardId/designs   # Create design in board
```

### Tasks

```
GET    /tasks                     # List all tasks (with filters)
GET    /tasks/:id                 # Get task by ID
PATCH  /tasks/:id                 # Update task (including column change for drag-drop)
DELETE /tasks/:id                 # Soft delete task
```

**Task Drag-Drop Example:**
```http
PATCH /tasks/:id
Content-Type: application/json

{
  "column": "DONE_IDEA",
  "positionKey": "0|hzzzzz"
}
```

### Designs

```
GET    /designs                   # List all designs (with filters)
GET    /designs/:id               # Get design by ID
POST   /boards/:boardId/designs   # Create design in board
PATCH  /designs/:id               # Update design (including approve/reject)
DELETE /designs/:id               # Soft delete design
```

**Design Approve Example:**
```http
PATCH /designs/:id
Content-Type: application/json

{
  "status": "APPROVED",
  "approvedAt": "2025-12-15T10:00:00Z"
}
```

**Design Reject Example:**
```http
PATCH /designs/:id
Content-Type: application/json

{
  "status": "REJECTED",
  "rejectReason": "Does not meet quality standards"
}
```

### Files

```
GET    /files                     # List all files
GET    /files/:id                 # Get file by ID
POST   /files                     # Upload/create file
PATCH  /files/:id                 # Update file metadata
DELETE /files/:id                 # Soft delete file
POST   /files/:fileId/attach      # Attach file to entity (EntityFile)
```

**Note:** File attachment might use a nested route since it creates a relationship (EntityFile), but the main file CRUD uses top-level routes.

### Comments

```
GET    /comments                  # List all comments (with filters)
GET    /comments/:id              # Get comment by ID
POST   /comments                  # Create comment (entityType + entityId in body)
PATCH  /comments/:id              # Update comment
DELETE /comments/:id              # Soft delete comment
```

### Activity Logs

```
GET    /activity-logs             # List activity logs (with filters)
GET    /activity-logs/:id         # Get activity log by ID
```

## Special Cases

### Roles and Permissions

Roles can be updated with permissions included in the same PATCH request:

```http
PATCH /roles/:id
Content-Type: application/json

{
  "name": "Manager",
  "description": "Updated description",
  "permissionIds": ["perm-id-1", "perm-id-2"]
}
```

**Note:** This follows the rule because:
- It's a `PATCH` on the top-level resource `/roles/:id`
- Permissions are part of the role's data, not a separate action
- No verb in the URL path

## Checklist for New Endpoints

When creating a new endpoint, ensure:

- [ ] Uses plural noun for resource name
- [ ] No verbs in the URL path
- [ ] Uses appropriate HTTP method (GET/POST/PATCH/DELETE)
- [ ] List/Create use nested routes for parent-child relationships
- [ ] Update/Delete use top-level routes
- [ ] Filtering/pagination via query parameters only
- [ ] State changes (approve, reject, move) use PATCH with status/field updates in body

## Migration Notes

If you find existing endpoints that violate these rules:

1. **Plan the migration** - Create a deprecation notice
2. **Update the endpoint** - Change to follow the rules
3. **Update documentation** - Update API docs and client code
4. **Maintain backward compatibility** (if needed) - Support both old and new endpoints temporarily
5. **Remove old endpoint** - After migration period

---

**Last Updated:** 2025-12-15

