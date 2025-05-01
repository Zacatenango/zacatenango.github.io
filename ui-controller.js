class UIController {
    constructor(firebaseService, chartManager) {
        this.firebaseService = firebaseService;
        this.chartManager = chartManager;
        this.state = {
            tasks: [],
            routineStartTime: null,
            timeToFirstTask: null,
            firstTaskCompleted: false,
            timerInterval: null,
            isPaused: false,
            totalPausedTime: 0,
            lastPauseTime: null,
            currentInterruptionId: null,
            currentInProgressTaskId: null
        };

        this.initializeUI();
    }

    initializeUI() {
        this.setupDateDisplay();
        this.initializeSortable();
        this.attachEventListeners();
        this.initializeFirebaseListeners();
    }

    setupDateDisplay() {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        $('#currentDate').text(dateString);
    }

    initializeSortable() {
        const taskList = document.getElementById('taskList');
        new Sortable(taskList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const taskIds = Array.from(taskList.children).map(item => item.dataset.id);
                this.updateTaskOrder(taskIds);
            }
        });
    }

    attachEventListeners() {
        $('#addTask').on('click', () => this.handleAddTask());
        $('#newTaskInput').on('keypress', (e) => {
            if (e.which === 13) this.handleAddTask();
        });

        $('#startRoutine').on('click', () => this.startRoutine());
        $('#pauseRoutine').on('click', () => this.pauseTimer());
        $('#resumeRoutine').on('click', () => this.resumeTimer());
        $('#completeRoutine').on('click', () => this.completeRoutine());
        $('#save-interruption').on('click', () => this.saveInterruption());
    }

    initializeFirebaseListeners() {
        this.firebaseService.onTasksChange(tasks => {
            this.state.tasks = tasks;
            this.renderTasks();
        });

        this.firebaseService.onTimerStateChange(timerState => {
            if (timerState && timerState.running) {
                this.updateTimerState(timerState);
            } else {
                this.resetTimerState();
            }
        });

        this.firebaseService.onConnectionChange(snapshot => {
            if (snapshot.val()) {
                console.log('Connected to Firebase');
                this.loadInitialData();
            } else {
                console.log('Disconnected from Firebase');
                this.showConnectionError();
            }
        });
    }

    async loadInitialData() {
        try {
            const [tasks, timerState] = await Promise.all([
                this.firebaseService.loadTasks(),
                this.firebaseService.loadTimerState()
            ]);

            this.state.tasks = tasks;
            if (timerState && timerState.running) {
                this.updateTimerState(timerState);
            }

            this.renderTasks();
            await this.loadChartData();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Error loading data. Please refresh the page.');
        }
    }

    async loadChartData() {
        const [interruptions, history] = await Promise.all([
            this.firebaseService.loadInterruptions(),
            this.firebaseService.loadRoutineHistory()
        ]);

        this.chartManager.renderInterruptionsChart(interruptions);
        this.chartManager.renderStepsInterruptionChart(this.state.tasks, interruptions);
        this.chartManager.renderDurationHistogramChart(interruptions);
        this.chartManager.renderComplianceChart(history);
    }

    renderTasks() {
        const taskListElement = $('#taskList');
        taskListElement.empty();

        if (!this.state.tasks || this.state.tasks.length === 0) {
            taskListElement.append('<p class="text-muted">No tasks added yet. Add your first task below.</p>');
            return;
        }

        this.state.tasks.forEach(task => {
            if (!task || !task.id || !task.name) return;

            const taskElement = this.createTaskElement(task);
            taskListElement.append(taskElement);
        });

        this.attachTaskEventListeners();
    }

    createTaskElement(task) {
        return $(`
            <div class="task-item draggable-task ${task.completed ? 'task-done' : ''} ${task.inProgress ? 'task-in-progress' : ''}" data-id="${task.id}">
                <div class="form-check d-flex justify-content-between align-items-center">
                    <div>
                        <input class="form-check-input task-checkbox" type="checkbox" 
                               id="task-${task.id}" ${task.completed ? 'checked' : ''}>
                        <label class="form-check-label" for="task-${task.id}">
                            ${task.name}
                        </label>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary set-in-progress" ${task.completed ? 'disabled' : ''}>
                            <i class="bi bi-play-fill"></i> Set In Progress
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-task">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    attachTaskEventListeners() {
        $('.task-checkbox').off('change').on('change', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            this.updateTaskStatus(taskId, e.target.checked);
        });

        $('.set-in-progress').off('click').on('click', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            this.toggleInProgress(taskId);
        });

        $('.delete-task').off('click').on('click', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            this.deleteTask(taskId);
        });
    }

    async handleAddTask() {
        const taskName = $('#newTaskInput').val().trim();
        if (taskName) {
            const maxOrder = this.state.tasks.reduce((max, task) => Math.max(max, task.order || 0), -1);
            await this.firebaseService.addTask(taskName, maxOrder + 1);
            $('#newTaskInput').val('');
        }
    }

    async updateTaskStatus(taskId, isCompleted) {
        await this.firebaseService.updateTaskStatus(taskId, {
            completed: isCompleted,
            inProgress: isCompleted ? false : this.state.tasks.find(t => t.id === taskId)?.inProgress || false
        });

        if (isCompleted && !this.state.firstTaskCompleted && this.state.routineStartTime) {
            this.state.firstTaskCompleted = true;
            const now = new Date();
            this.state.timeToFirstTask = (now - this.state.routineStartTime) - this.state.totalPausedTime;
            await this.updateTimerStateInFirebase();
        }
    }

    async toggleInProgress(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!task.inProgress) {
            // Clear other in-progress tasks
            await Promise.all(this.state.tasks
                .filter(t => t.id !== taskId && t.inProgress)
                .map(t => this.firebaseService.updateTaskStatus(t.id, { inProgress: false }))
            );
        }

        await this.firebaseService.updateTaskStatus(taskId, { 
            inProgress: !task.inProgress 
        });
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            await this.firebaseService.deleteTask(taskId);
        }
    }

    async updateTaskOrder(taskIds) {
        const updates = {};
        taskIds.forEach((id, index) => {
            updates[id] = { order: index };
        });
        await this.firebaseService.updateTaskOrder(updates);
    }

    // Timer-related methods
    startRoutine() {
        this.state.routineStartTime = new Date();
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
        this.state.lastPauseTime = null;

        this.updateTimerStateInFirebase();
        this.updateButtonStates();
        this.startTimerIntervals();
    }

    pauseTimer() {
        if (!this.state.routineStartTime || this.state.isPaused) return;

        this.state.isPaused = true;
        this.state.lastPauseTime = new Date();
        
        const currentTask = this.state.tasks.find(t => t.inProgress);
        this.state.currentInProgressTaskId = currentTask?.id;

        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval.display);
            clearInterval(this.state.timerInterval.sync);
        }

        this.updateButtonStates();
        this.showInterruptionForm();
        this.updateTimerStateInFirebase();
    }

    resumeTimer() {
        if (!this.state.routineStartTime || !this.state.isPaused) return;

        this.hideInterruptionForm();

        const now = new Date();
        const pauseDuration = now - this.state.lastPauseTime;
        this.state.totalPausedTime += pauseDuration;

        this.state.isPaused = false;
        this.state.lastPauseTime = null;
        this.state.currentInProgressTaskId = null;

        this.updateButtonStates();
        this.startTimerIntervals();
        this.updateTimerStateInFirebase();
    }

    async completeRoutine() {
        if (!this.state.routineStartTime || this.state.isPaused) return;

        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval.display);
            clearInterval(this.state.timerInterval.sync);
        }

        const endTime = new Date();
        const durationMinutes = Math.round(((endTime - this.state.routineStartTime) - this.state.totalPausedTime) / 60000);
        const completedCount = this.state.tasks.filter(task => task.completed).length;
        const completionPercent = this.state.tasks.length > 0 ? 
            Math.round((completedCount / this.state.tasks.length) * 100) : 0;

        const routineRecord = {
            date: this.getCurrentDateString(),
            timestamp: Date.now(),
            durationMinutes,
            tasksCompleted: completedCount,
            totalTasks: this.state.tasks.length,
            completionRate: completionPercent,
            totalPausedTimeMinutes: Math.round(this.state.totalPausedTime / 60000),
            timeToFirstTaskMs: this.state.timeToFirstTask
        };

        await this.firebaseService.saveRoutineRecord(routineRecord);
        await this.firebaseService.saveTimerState({ running: false, paused: false });

        this.resetTimerState();
        this.updateButtonStates();
        this.showCompletionMessage(durationMinutes, completionPercent);
        await this.loadChartData();
    }

    // UI Update methods
    updateButtonStates() {
        $('#startRoutine').prop('disabled', this.state.routineStartTime !== null);
        $('#completeRoutine').prop('disabled', !this.state.routineStartTime || this.state.isPaused);
        $('#pauseRoutine').prop('disabled', !this.state.routineStartTime || this.state.isPaused);
        $('#resumeRoutine').prop('disabled', !this.state.routineStartTime || !this.state.isPaused);

        if (this.state.routineStartTime) {
            if (this.state.isPaused) {
                $('#pauseRoutine').hide();
                $('#resumeRoutine').show();
            } else {
                $('#pauseRoutine').show();
                $('#resumeRoutine').hide();
            }
        }
    }

    updateTimer() {
        if (!this.state.routineStartTime || this.state.isPaused) return;

        const now = new Date();
        const elapsedMs = (now - this.state.routineStartTime) - this.state.totalPausedTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        $('#currentTimer').text(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );

        if (!this.state.firstTaskCompleted) {
            $('#timeToFirstTask').text(
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }
    }

    startTimerIntervals() {
        this.updateTimer();
        const displayInterval = setInterval(() => this.updateTimer(), 1000);
        const syncInterval = setInterval(() => this.updateTimerStateInFirebase(), 15000);
        this.state.timerInterval = { display: displayInterval, sync: syncInterval };
    }

    // Firebase state update methods
    async updateTimerStateInFirebase() {
        if (!this.state.routineStartTime) return;

        const now = new Date();
        const elapsedMs = (now - this.state.routineStartTime) - this.state.totalPausedTime;
        
        await this.firebaseService.saveTimerState({
            running: true,
            elapsedMinutes: Math.floor(elapsedMs / 60000),
            elapsedSeconds: Math.floor((elapsedMs % 60000) / 1000),
            totalPausedTime: this.state.totalPausedTime,
            paused: this.state.isPaused,
            startTime: this.state.routineStartTime.toISOString(),
            lastPauseTime: this.state.lastPauseTime ? this.state.lastPauseTime.toISOString() : null,
            currentInProgressTaskId: this.state.currentInProgressTaskId,
            firstTaskCompleted: this.state.firstTaskCompleted,
            timeToFirstTask: this.state.timeToFirstTask,
            lastUpdated: Date.now()
        });
    }

    // Helper methods
    getCurrentDateString() {
        return new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    showInterruptionForm() {
        $('#interruption-form').addClass('visible');
        $('#interruption-reason').val('').focus();
    }

    hideInterruptionForm() {
        $('#interruption-form').removeClass('visible');
        $('#interruption-reason').val('');
    }

    showCompletionMessage(durationMinutes, completionPercent) {
        $('#routineStatus')
            .removeClass('alert-warning')
            .addClass('alert-success')
            .html(`Routine completed! <strong>${durationMinutes} minutes</strong> with ${completionPercent}% tasks completed`);
    }

    showConnectionError() {
        $('#routineStatus')
            .addClass('alert-danger')
            .html('Connection lost. Trying to reconnect...');
    }

    showError(message) {
        $('#routineStatus')
            .addClass('alert-danger')
            .html(message);
    }

    resetTimerState() {
        this.state.routineStartTime = null;
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
        this.state.lastPauseTime = null;
        this.state.currentInProgressTaskId = null;

        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval.display);
            clearInterval(this.state.timerInterval.sync);
        }

        this.updateButtonStates();
        $('#routineStatus')
            .removeClass('alert-warning alert-success')
            .addClass('alert-info')
            .html('Ready to start your routine');
    }

    updateTimerState(state) {
        if (state.startTime) {
            this.state.routineStartTime = new Date(state.startTime);
        }
        this.state.isPaused = state.paused || false;
        this.state.totalPausedTime = state.totalPausedTime || 0;
        this.state.currentInProgressTaskId = state.currentInProgressTaskId || null;
        this.state.firstTaskCompleted = state.firstTaskCompleted || false;
        this.state.timeToFirstTask = state.timeToFirstTask || null;

        if (this.state.isPaused && state.lastPauseTime) {
            this.state.lastPauseTime = new Date(state.lastPauseTime);
        }

        this.updateTimer();
        this.updateButtonStates();
        
        if (!this.state.isPaused) {
            this.startTimerIntervals();
        }
    }
}

export default UIController;