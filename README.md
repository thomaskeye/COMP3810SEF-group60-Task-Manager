# COMP3810SEF-group60-Task-Manger
Group project of group 60

## Smart Task Manager

A full-stack task management application built with Express.js, MongoDB, and EJS. Features include user authentication, task CRUD operations, drag-and-drop task ordering, calendar view, and a RESTful API.

**Live Demo: https://comp3810sef-group60-task-manger.onrender.com

## Features

- ✅ Simple username/password authentication
- ✅ "Login with Google" (OAuth 2.0) option
- ✅ Server-side sessions via express-session + Passport
- ✅ Task CRUD operations (Create, Read, Update, Delete)
- ✅ Task prioritization (low, medium, high)
- ✅ Task status tracking (pending, done)
- ✅ Deadline management
- ✅ **Drag-and-drop task ordering** (SortableJS)
- ✅ **Calendar view** (FullCalendar) to visualize tasks by deadline
- ✅ RESTful API endpoints
- ✅ Secure session management
- ✅ User-friendly error messages
- ✅ Session expiry handling

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=3000
SESSION_SECRET=your_strong_random_secret_here
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
# Optional: override the default callback (http://localhost:3000/auth/google/callback)
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
```

To enable Google login you need a Google Cloud project with an OAuth 2.0 Web application client. Add `http://localhost:3000/auth/google/callback` (and your production URL) to the authorized redirect URIs, then copy the client ID and secret into the variables above.




The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Cloud Deployment to Render

This application is configured for deployment on [Render](https://render.com), a modern cloud platform that makes deployment simple and automatic.

### Prerequisites

Before deploying, ensure you have:
- A GitHub repository with your code (already connected to Render)
- A MongoDB Atlas account (free tier available)

### Step-by-Step Deployment Guide

#### 1. Set Up MongoDB Atlas

1. **Create a MongoDB Atlas account** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a new cluster** (free M0 tier is sufficient)
3. **Create a database user:**
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create a username and strong password (save these!)
4. **Whitelist IP addresses:**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (or add Render's IP ranges)
5. **Get your connection string:**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (e.g., `smart_task_manager`)
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/smart_task_manager`

#### 2. Deploy to Render

1. **Create a new Web Service:**
   - In your Render dashboard, click "New +" → "Web Service"
   - Your GitHub repository should already be connected
   - Select your repository from the list
   - Choose the branch to deploy (usually `main` or `master`)

2. **Configure the service:**
   - **Name:** Choose a name for your service (e.g., `smart-task-manager`)
   - **Environment:** Select "Node" (auto-detected)
   - **Build Command:** `npm install` (auto-filled)
   - **Start Command:** `npm start` (auto-filled from package.json)
   - **Plan:** Free tier is sufficient for demos

3. **Add Environment Variables:**
   Click "Advanced" → "Add Environment Variable" and add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (from step 1)
   - `SESSION_SECRET`: Generate a strong random secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `NODE_ENV`: `production`
   - `PORT`: Leave empty (Render sets this automatically)

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Wait for the build to complete (usually 2-5 minutes)
   - Your app will be live at `https://your-app-name.onrender.com`

#### 3. Post-Deployment

- **Automatic Deploys:** Render automatically deploys on every push to your connected branch
- **View Logs:** Check the "Logs" tab in Render dashboard for any issues
- **Update Environment Variables:** Go to "Environment" tab to modify variables
- **Custom Domain:** Add a custom domain in the "Settings" tab (optional)

### Troubleshooting

- **Build fails:** Check that `package.json` has the correct `start` script
- **App crashes:** Check logs for MongoDB connection errors
- **Session issues:** Ensure `SESSION_SECRET` is set and is a strong random string
- **Database connection:** Verify MongoDB Atlas IP whitelist includes Render's IPs (or 0.0.0.0/0)


## Demo Guide

### Demo Credentials

For testing purposes, you can use these credentials or create your own:

- **Username:** `demo_user`
- **Password:** `demo123`

> **Note:** Use the Register page to create new accounts before logging in.

### RESTful API Examples

See [demo.md](./demo.md) for comprehensive CURL examples and API documentation.

**Quick API Examples:**

```bash
# Get all tasks (requires authentication)
curl -X GET http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -b "stm.sid=YOUR_SESSION_COOKIE"

# Create a new task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -b "stm.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive README",
    "priority": "high",
    "deadline": "2024-12-20"
  }'

# Update a task
curl -X PUT http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -b "stm.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "status": "done"
  }'

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -b "stm.sid=YOUR_SESSION_COOKIE"
```

For detailed API documentation with all endpoints, see [demo.md](./demo.md).

## Security Notes

- ✅ httpOnly express-session cookies (only a session ID is stored client-side; user data stays on the server)
- ✅ Optional Google OAuth 2.0 login with verified Google accounts
- ⚠️ Passwords created via the Register page are stored as plain text (demo only)
- ⚠️ Server-side validation is intentionally minimal so you can experiment freely

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback
- `POST /logout` - Logout user
- `GET /change-password` - Change password page
- `POST /change-password` - Update password

### Tasks (Form-based)
- `GET /dashboard` - Dashboard with tasks (list view and calendar view)
- `POST /tasks` - Create new task
- `POST /tasks/:id/status` - Update task status
- `POST /tasks/:id/delete` - Delete task

### Tasks (RESTful API - JSON)
- `GET /api/tasks` - Get all tasks for current user
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/reorder` - Reorder tasks (for drag-and-drop)

## Validation Rules

The app intentionally keeps validation simple. Login and Register only require that the fields are filled in, while task forms and APIs accept whatever text/values you send so you can prototype quickly.

## Project Structure

```
├── Models/
│   ├── User.js          # User model (Mongoose schema)
│   └── Task.js          # Task model (Mongoose schema)
├── Views/
│   ├── login.ejs        # Login page
│   ├── dashboard.ejs    # Dashboard page (with list and calendar views)
│   └── change-password.ejs  # Change password page
├── Public/
│   ├── css/
│   │   └── styles.css   # Stylesheet
│   └── js/
│       └── main.js      # Frontend JavaScript (drag-and-drop, calendar)
├── Server.js            # Main server file
├── package.json         # Dependencies and scripts
├── demo.md              # Demo guide with CURL examples
└── .env                 # Environment variables (not in git)
```

## Originality Features

### 1. Drag-and-Drop Task Ordering
- Tasks can be reordered by dragging and dropping in the list view
- Order is persisted to the database
- Uses SortableJS library for smooth interactions

### 2. Calendar View
- Visualize tasks by deadline using FullCalendar
- Switch between list view and calendar view
- Tasks are color-coded by priority (red=high, orange=medium, green=low)
- Click on calendar events to view task details

## Error Handling

The application includes comprehensive error handling:

- **Invalid Login:** Clear error messages for incorrect credentials
- **Invalid Task Input:** User-friendly validation error messages
- **Session Expiry:** Graceful handling with redirect to login and informative messages
- **CRUD Actions:** Success and error messages displayed after all operations
- **API Errors:** JSON error responses with descriptive messages

## Notes

- New users are automatically created on first login
- Passwords are stored as plain text to keep the demo simple
- Sessions expire after 24 hours
- The application requires MongoDB to be running and accessible
- Drag-and-drop ordering is saved automatically when tasks are reordered
- Calendar view shows tasks with deadlines; tasks without deadlines appear on creation date

## License

This project is part of COMP3810SEF coursework.
