// Front-end JavaScript for Smart Task Manager
// Handles drag-and-drop task ordering and calendar view

console.log("Smart Task Manager front-end loaded");

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeDragAndDrop();
  initializeCalendar();
  initializeViewToggle();
});

// Initialize SortableJS for drag-and-drop task ordering
function initializeDragAndDrop() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  const sortable = Sortable.create(taskList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: function(evt) {
      // Get all task IDs in new order
      const taskItems = Array.from(taskList.querySelectorAll('.task-item'));
      const taskIds = taskItems.map(item => item.getAttribute('data-task-id'));

      // Send new order to server
      fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds: taskIds })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Tasks reordered:', data);
        // Optionally show a success message
        showTemporaryMessage('Tasks reordered successfully', 'success');
      })
      .catch(error => {
        console.error('Error reordering tasks:', error);
        showTemporaryMessage('Failed to save task order', 'error');
        // Reload page to restore original order
        location.reload();
      });
    }
  });
}

// Initialize FullCalendar
function initializeCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl || typeof tasksData === 'undefined') return;

  // Format tasks for FullCalendar
  const events = tasksData.map(task => {
    const color = getPriorityColor(task.priority);
    const title = `${task.title} (${task.priority})`;
    
    return {
      id: task._id,
      title: title,
      start: task.deadline ? task.deadline : task.createdAt,
      backgroundColor: color,
      borderColor: color,
      textColor: '#fff',
      extendedProps: {
        description: task.description,
        priority: task.priority,
        status: task.status
      }
    };
  });

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    events: events,
    eventClick: function(info) {
      const task = tasksData.find(t => t._id === info.event.id);
      if (task) {
        let message = `Task: ${task.title}\n`;
        message += `Priority: ${task.priority}\n`;
        message += `Status: ${task.status}\n`;
        if (task.description) {
          message += `Description: ${task.description}\n`;
        }
        if (task.deadline) {
          message += `Deadline: ${new Date(task.deadline).toLocaleDateString()}`;
        }
        alert(message);
      }
    },
    eventDidMount: function(info) {
      // Add tooltip
      info.el.setAttribute('title', info.event.extendedProps.description || info.event.title);
    }
  });

  calendar.render();
  window.calendar = calendar; // Store reference for refreshing
}

// Get color based on priority
function getPriorityColor(priority) {
  switch(priority) {
    case 'high':
      return '#dc2626'; // red
    case 'medium':
      return '#d97706'; // orange
    case 'low':
      return '#059669'; // green
    default:
      return '#6b7280'; // gray
  }
}

// Initialize view toggle (List/Calendar)
function initializeViewToggle() {
  const listViewBtn = document.getElementById('listViewBtn');
  const calendarViewBtn = document.getElementById('calendarViewBtn');
  const listView = document.getElementById('listView');
  const calendarView = document.getElementById('calendarView');

  if (!listViewBtn || !calendarViewBtn) return;

  listViewBtn.addEventListener('click', function() {
    listViewBtn.classList.add('active');
    calendarViewBtn.classList.remove('active');
    listView.classList.add('active');
    calendarView.classList.remove('active');
  });

  calendarViewBtn.addEventListener('click', function() {
    calendarViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    calendarView.classList.add('active');
    listView.classList.remove('active');
    
    // Refresh calendar if needed
    if (window.calendar) {
      window.calendar.render();
    }
  });
}

// Show temporary message
function showTemporaryMessage(message, type) {
  const alertClass = type === 'success' ? 'success' : 'error';
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${alertClass}`;
  alertDiv.textContent = message;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '1000';
  alertDiv.style.minWidth = '200px';
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}
