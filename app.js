document.addEventListener('DOMContentLoaded', function() {
    // Инициализация элементов
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTask');
    const taskList = document.getElementById('taskList');
    const notifyButton = document.getElementById('notifyButton');
    const filterButtons = document.querySelectorAll('.filters button');
    
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';
    let reminderInterval = null; // Для управления интервалом уведомлений

    // Инициализация Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('SW Registered'))
            .catch(err => console.log('SW Error:', err));
    }

    // Обработчики событий
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTask();
    });
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            currentFilter = this.dataset.filter;
            filterButtons.forEach(b => b.classList.toggle('active', b === this));
            renderTasks();
        });
    });
    
    notifyButton.addEventListener('click', toggleNotifications);

    // Делегирование событий для списка задач
    taskList.addEventListener('click', function(e) {
        const taskElement = e.target.closest('li');
        if (!taskElement) return;
        
        const taskId = Number(taskElement.dataset.id);
        if (isNaN(taskId)) return;
        
        toggleTask(taskId);
    });

    // Основные функции
    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;
        
        tasks.push({
            text,
            completed: false,
            id: Date.now()
        });
        
        saveAndRender();
        taskInput.value = '';
        
        // Уведомление о новой задаче
        if (Notification.permission === 'granted') {
            new Notification('✅ Новая задача', {
                body: text,
                icon: 'icon-192.png'
            });
        }
    }

    function toggleTask(id) {
        tasks = tasks.map(task => 
            task.id === id ? {...task, completed: !task.completed} : task
        );
        saveAndRender();
    }

    function saveAndRender() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    }

    function renderTasks() {
        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'active') return !task.completed;
            if (currentFilter === 'completed') return task.completed;
            return true;
        });

        taskList.innerHTML = filteredTasks.map(task => `
            <li class="${task.completed ? 'completed' : ''}" 
                data-id="${task.id}">
                ${task.text}
            </li>
        `).join('');
    }

    function toggleNotifications() {
        if (Notification.permission === 'granted' && reminderInterval) {
            // Отключаем уведомления
            clearInterval(reminderInterval);
            reminderInterval = null;
            notifyButton.textContent = '🔔 Включить уведомления';
        } else {
            // Включаем уведомления
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    startReminderInterval();
                    notifyButton.textContent = '🔕 Отключить уведомления';
                }
            });
        }
    }

    function startReminderInterval() {
        // Очищаем предыдущий интервал
        if (reminderInterval) clearInterval(reminderInterval);
        
        // Устанавливаем новый интервал (2 часа)
        reminderInterval = setInterval(() => {
            const activeTasks = tasks.filter(t => !t.completed);
            if (activeTasks.length > 0 && Notification.permission === 'granted') {
                new Notification('⏰ Напоминание', {
                    body: `У вас ${activeTasks.length} невыполненных задач!`,
                    icon: 'icon-192.png'
                });
            }
        }, 10 * 1000); // 7200000 мс = 2 часа
    }

    // Проверяем состояние уведомлений при загрузке
    if (Notification.permission === 'granted') {
        startReminderInterval();
        notifyButton.textContent = '🔕 Отключить уведомления';
    }

    // Первоначальный рендеринг
    renderTasks();
});