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
            currentInterruptionId: null
        };

        this.initializeUI();
    }

    initializeUI() {
        this.setupDateDisplay();
        this.attachEventListeners();
        this.initializeFirebaseListeners();
        this.loadInitialData();
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
        
        $('#interruption-reason').on('keypress', (e) => {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                this.saveInterruption();
            }
        });
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
            const [tasks, timerState, interruptions, history] = await Promise.all([
                this.firebaseService.loadTasks(),
                this.firebaseService.loadTimerState(),
                this.firebaseService.loadInterruptions(),
                this.firebaseService.loadRoutineHistory()
            ]);

            this.state.tasks = tasks;
            if (timerState && timerState.running) {
                this.updateTimerState(timerState);
            }

            this.renderTasks();
            this.renderInterruptions(interruptions);
            this.chartManager.renderComplianceChart(history);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Error loading data. Please refresh the page.');
        }
    }

    renderTasks() {
        const taskListElement = $('#taskList');
        taskListElement.empty();
        
        if (this.state.tasks.length === 0) {
            taskListElement.append('<p class="text-muted">No tasks added yet. Add your first task below.</p>');
            return;
        }
        
        this.state.tasks.forEach(task => {
            const taskElement = $(`
                <div class="task-item ${task.completed ? 'task-done' : ''}" data-id="${task.id}">
                    <div class="form-check">
                        <input class="form-check-input task-checkbox" type="checkbox" 
                               id="task-${task.id}" ${task.completed ? 'checked' : ''}>
                        <label class="form-check-label" for="task-${task.id}">
                            ${task.name}
                        </label>
                        <button class="btn btn-sm btn-outline-danger float-end delete-task">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>
            `);
            taskListElement.append(taskElement);
        });
        
        this.attachTaskEventListeners();
    }

    attachTaskEventListeners() {
        $('.task-checkbox').on('change', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            const isCompleted = $(e.target).is(':checked');
            this.updateTaskStatus(taskId, isCompleted);
        });
        
        $('.delete-task').on('click', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            this.deleteTask(taskId);
        });
    }

    async handleAddTask() {
        const taskName = $('#newTaskInput').val().trim();
        if (taskName) {
            await this.firebaseService.addTask(taskName);
            $('#newTaskInput').val('');
        }
    }

    async updateTaskStatus(taskId, isCompleted) {
        await this.firebaseService.updateTaskStatus(taskId, { completed: isCompleted });

        if (isCompleted && !this.state.firstTaskCompleted && this.state.routineStartTime) {
            this.state.firstTaskCompleted = true;
            const now = new Date();
            this.state.timeToFirstTask = (now - this.state.routineStartTime) - this.state.totalPausedTime;
            await this.updateTimerStateInFirebase();
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            await this.firebaseService.deleteTask(taskId);
        }
    }

    startRoutine() {
        this.state.routineStartTime = new Date();
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
        this.state.lastPauseTime = null;
        
        this.updateTimerStateInFirebase();
        this.updateButtonStates();
        this.startTimerIntervals();

        $('#routineStatus')
            .removeClass('alert-info')
            .addClass('alert-warning')
            .html('Routine in progress... <span class="timer-running">Timer running</span>');
    }

    pauseTimer() {
        if (!this.state.routineStartTime || this.state.isPaused) return;

        this.state.isPaused = true;
        this.state.lastPauseTime = new Date();
        
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval.display);
            clearInterval(this.state.timerInterval.sync);
        }

        this.updateButtonStates();
        $('#routineStatus').html('Routine paused... <span class="timer-paused">Timer paused</span>');
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
        this.state.currentInterruptionId = null;

        this.updateButtonStates();
        $('#routineStatus').html('Routine in progress... <span class="timer-running">Timer running</span>');
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
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            durationMinutes: durationMinutes,
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
        $('#routineStatus')
            .removeClass('alert-warning')
            .addClass('alert-success')
            .html(`Routine completed! <strong>${durationMinutes} minutes</strong> with ${completionPercent}% tasks completed`);
            
        await this.loadInitialData();
    }

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
            currentInterruptionId: this.state.currentInterruptionId,
            firstTaskCompleted: this.state.firstTaskCompleted,
            timeToFirstTask: this.state.timeToFirstTask,
            lastUpdated: Date.now()
        });
    }

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

    async saveInterruption() {
        const reason = $('#interruption-reason').val().trim();
        if (!reason) {
            alert('Please provide a reason for the interruption');
            return;
        }
        
        const now = new Date();
        const duration = now - this.state.lastPauseTime;
        
        const interruption = {
            timestamp: now.getTime(),
            reason: reason,
            duration: duration,
            routineId: this.state.routineStartTime.getTime()
        };
        
        const ref = await this.firebaseService.saveInterruption(interruption);
        this.state.currentInterruptionId = ref.key;
        this.hideInterruptionForm();
        await this.loadInitialData();
    }

    renderInterruptions(interruptions) {
        const tbody = $('#interruption-log');
        tbody.empty();

        if (interruptions.length === 0) {
            tbody.append('<tr><td colspan="4">No interruptions logged yet</td></tr>');
        } else {
            interruptions.forEach(interruption => {
                const date = new Date(interruption.timestamp);
                const formattedDate = date.toLocaleDateString();
                const formattedTime = date.toLocaleTimeString();
                const duration = Math.round(interruption.duration / 60000);
                
                tbody.append(`
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${formattedTime}</td>
                        <td>${duration} min</td>
                        <td>${interruption.reason}</td>
                    </tr>
                `);
            });
        }
    }

    updateTimerState(state) {
        if (state.startTime) {
            this.state.routineStartTime = new Date(state.startTime);
        }
        this.state.isPaused = state.paused;
        this.state.totalPausedTime = state.totalPausedTime || 0;
        this.state.lastPauseTime = state.lastPauseTime ? new Date(state.lastPauseTime) : null;
        this.state.currentInterruptionId = state.currentInterruptionId;
        this.state.firstTaskCompleted = state.firstTaskCompleted;
        this.state.timeToFirstTask = state.timeToFirstTask;

        this.updateButtonStates();
        if (!this.state.isPaused) {
            this.startTimerIntervals();
        }
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
        this.state.currentInterruptionId = null;

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
}

export default UIController;