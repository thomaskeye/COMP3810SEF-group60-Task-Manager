# COMP3810SEF-group60-Task-Manger
Group project of group 60

## Smart Task Manager

A full-stack task management application built with Express.js, MongoDB, and EJS.

## Features

- User authentication with password hashing (bcrypt)
- Task CRUD operations (Create, Read, Update, Delete)
- Task prioritization (low, medium, high)
- Task status tracking (pending, done)
- Deadline management
- RESTful API endpoints
- Input validation and sanitization
- Secure session management

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update it with your values:

```bash
cp .env.example .env
```

Then edit the `.env` file and update the following variables:

- **MONGODB_URI**: Your MongoDB connection string
  - For local MongoDB: `mongodb://localhost:27017/smart_task_manager`
  - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database`
- **PORT**: Server port (optional, defaults to 3000)
- **SESSION_SECRET**: A strong random string for session encryption
  - Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Important:** 
- Never commit your `.env` file to version control. It's already included in `.gitignore`.
- The `.env.example` file is a template with placeholder values and is safe to commit.

### 3. Run the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Input validation and sanitization
- ✅ XSS protection via input escaping
- ✅ Secure session cookies (httpOnly, secure in production)
- ✅ MongoDB ObjectId validation
- ✅ Input length limits
- ✅ No hardcoded credentials

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `POST /logout` - Logout user

### Tasks (Form-based)
- `GET /dashboard` - Dashboard with tasks
- `POST /tasks` - Create new task
- `POST /tasks/:id/status` - Update task status
- `POST /tasks/:id/delete` - Delete task

### Tasks (RESTful API - JSON)
- `GET /api/tasks` - Get all tasks for current user
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Validation Rules

### Username
- 3-30 characters
- Only letters, numbers, and underscores

### Password
- No minimum length requirement

### Task Title
- 1-200 characters
- Required

### Task Description
- Maximum 2000 characters
- Optional

### Priority
- Must be: "low", "medium", or "high"

### Status
- Must be: "pending" or "done"

## Project Structure

```
├── Models/
│   ├── User.js          # User model (Mongoose schema)
│   └── Task.js          # Task model (Mongoose schema)
├── Views/
│   ├── login.ejs        # Login page
│   └── dashboard.ejs    # Dashboard page
├── Public/
│   ├── css/
│   │   └── styles.css   # Stylesheet
│   └── js/
│       └── main.js      # Frontend JavaScript
├── Server.js            # Main server file
├── package.json         # Dependencies and scripts
└── .env                 # Environment variables (not in git)
```

## Notes

- New users are automatically created on first login
- All passwords are hashed using bcrypt before storage
- Sessions expire after 24 hours
- The application requires MongoDB to be running and accessible
