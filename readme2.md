# COMP3810SEF Group60 Project
## Project infomation
Group number: 

60 

Members:

14113367 Wong Chak Lam

13494426 Malaika-Tariq

13489207 Chiu Hang Yin

## Project file introduction
### server.js
The overall functionality of a Smart Task Manager would include high-level purposes like:

1. User Authentication: Local and Google OAuth 2.0 login system

2. Task CRUD Operations: Full create, read, update, delete functionality

3. Session Management: Secure session handling with express-session

4. RESTful API: JSON API endpoints for programmatic access

5. Task Organization: Priority-based sorting and deadline management

6. Drag & Drop Reordering: Interactive task reordering via API
### package.json
### Core Dependencies:

"express":"^4.21.2" - Web application framework

"mongoose":"^8.6.0" - MongoDB object modeling

"mongodb":"^7.0.0" - MongoDB driver

"ejs":"^3.1.10" - Templating engine for views

### Authentication & Security:

"passport":"^0.7.0" - Authentication middleware

"passport-local":"^1.0.0" - Local username/password strategy

"passport-google-oauth20":"^2.0.0" - Google OAuth 2.0 strategy

"express-session":"^1.18.0" - Session management

"bcrypt":"^5.1.1" - Password hashing

### Configuration:

"dotenv":"^16.4.5" - Environment variable management

### Development:

"nodemon":"^3.1.7" - Auto-restart during development

### Scripts:

npm start - Production server start
### public
-css
-js
### views
-change-password.ejs
-dashboard.ejs
-login.ejs
-register.ejs
### models
-Task.js
-USer.js
## Cloud-based server URL
https://comp3810sef-group60-task-manger.onrender.com
## Operation guides 
### Use of Login/Logout pages
Sign-in Steps:

1. Register an account OR Continue with your previous account or Google 

2. Enter valid username and password OR Click the "Continue with Google" button

3. Click "Login" button

4. Upon successful authentication, you'll be redirected to the dashboard

5. To logout, click "Logout" button at the right top corner

### Use of your CRUD web pages
Create Tasks:

1. Fill in task details (title, dedline, description, priority)

2. Click "Add Task" button on dashboard

3. "Task created successfully!" message will be shown

Read/View Tasks:
1. Dashboard shows all tasks in a organized view 

2. There are list view or calendar view

3. Calendar viw can show in month, week or list
 
4. Click on any task card to view detailed information

Update Tasks:
1. Mark tasks as complete using the "Mark Done" button

Delete Tasks:
1. Click "Delete" button on any task card

2. Confirm deletion in the confirmation dialog

3. Tasks are permanently removed from the system
  
### Use of your RESTFUL CRUD sevices
GET:

-list all tasks

POST:

-update task order after drag-and-drop

-create a new task

PUT:

-update an existing task

DELETE:

-delete a task



