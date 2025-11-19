# Smart Task Manager - Demo Guide

## Demo Credentials

For demonstration purposes, you can use the following credentials or create your own:

**Test User 1:**
- Username: `demo_user`
- Password: `demo123`

**Test User 2:**
- Username: `student01`
- Password: `password123`

> **Note:** New users are automatically created on first login. If a user doesn't exist, the system will create it with the provided password.

## RESTful API CURL Examples

All API endpoints require authentication via session cookies. For testing, you'll need to:
1. First login via the web interface to get a session cookie
2. Extract the session cookie from your browser
3. Use it in CURL commands with the `-b` flag

Alternatively, you can use the API endpoints after logging in through the web interface.

### Base URL
Replace `http://localhost:3000` with your deployment URL (e.g., `https://your-app.onrender.com`)

---

### 1. GET /api/tasks - List All Tasks

Retrieve all tasks for the authenticated user.

```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE"
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Finish COMP 3810 assignment",
    "description": "Complete the final project",
    "priority": "high",
    "status": "pending",
    "deadline": "2024-12-15T00:00:00.000Z",
    "userId": "507f191e810c19729de860ea",
    "createdAt": "2024-11-01T10:00:00.000Z",
    "updatedAt": "2024-11-01T10:00:00.000Z"
  }
]
```

---

### 2. POST /api/tasks - Create a New Task

Create a new task with title, description, priority, and deadline.

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive README and API documentation",
    "priority": "high",
    "deadline": "2024-12-20",
    "status": "pending"
  }'
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Complete project documentation",
  "description": "Write comprehensive README and API documentation",
  "priority": "high",
  "status": "pending",
  "deadline": "2024-12-20T00:00:00.000Z",
  "userId": "507f191e810c19729de860ea",
  "createdAt": "2024-11-01T11:00:00.000Z",
  "updatedAt": "2024-11-01T11:00:00.000Z"
}
```

**Minimal Example (only title required):**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Simple task"
  }'
```

---

### 3. PUT /api/tasks/:id - Update an Existing Task

Update one or more fields of an existing task.

```bash
curl -X PUT http://localhost:3000/api/tasks/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "status": "done",
    "priority": "low"
  }'
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Finish COMP 3810 assignment",
  "description": "Complete the final project",
  "priority": "low",
  "status": "done",
  "deadline": "2024-12-15T00:00:00.000Z",
  "userId": "507f191e810c19729de860ea",
  "createdAt": "2024-11-01T10:00:00.000Z",
  "updatedAt": "2024-11-01T12:00:00.000Z"
}
```

**Update deadline only:**
```bash
curl -X PUT http://localhost:3000/api/tasks/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE" \
  -d '{
    "deadline": "2024-12-25"
  }'
```

---

### 4. DELETE /api/tasks/:id - Delete a Task

Delete a task by ID.

```bash
curl -X DELETE http://localhost:3000/api/tasks/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -b "session=YOUR_SESSION_COOKIE"
```

**Response:**
```json
{
  "message": "Task deleted"
}
```

---

## Testing Without Session Cookies

If you want to test the API without manually extracting cookies, you can use a tool like:

1. **Postman** - Import the endpoints and manage cookies automatically
2. **Browser DevTools** - Use the Network tab to copy requests as CURL
3. **httpie** - Alternative to CURL with better cookie handling

## Example Workflow

1. **Login via web interface:**
   - Navigate to `http://localhost:3000/login`
   - Login with credentials (e.g., `demo_user` / `demo123`)

2. **Get session cookie:**
   - Open browser DevTools (F12)
   - Go to Application/Storage tab
   - Copy the `session` cookie value

3. **Test API endpoints:**
   - Use the CURL commands above with your session cookie
   - Replace `YOUR_SESSION_COOKIE` with the actual cookie value

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 400 Bad Request (Validation Error)
```json
{
  "errors": [
    {
      "msg": "Title must be between 1 and 200 characters",
      "param": "title",
      "location": "body"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Task not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create task"
}
```

