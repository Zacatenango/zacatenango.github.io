import { DataService } from './data-service.js';
import { ChartController } from './chart-controller.js';

export class UIController {
    constructor() {
        this.tasks = [];
        this.routineStartTime = null;
        this.timeToFirstTask = null;
        this.firstTaskCompleted = false;
        this.timerInterval = null;
        this.isPaused = false;
        this.totalPausedTime = 0;
        this.lastPauseTime = null;
        this.currentInterruptionId = null;
        this.chartController = new ChartController();

        this.initializeEventListeners();
        this.loadInitialData();
    }

    async loadInitialData() {
        this.tasks = await DataService.loadTasks();
        const complianceData = await DataService.loadComplianceData();
        const timerState = await DataService.loadTimerState();
        
        this.renderTasks();
        this.chartController.updateStats(complianceData);
        this.chartController.renderChart(complianceData);
        await this.loadInterruptions();
        this.restoreTimerState(timerState);
    }

    initializeEventListeners() {
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
        
        // Set current date
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        $('#currentDate').text(dateString);
    }

    renderTasks() {
        const taskListElement = $('#taskList');
        taskListElement.empty();
        
        if (this.tasks.length === 0) {
            taskListElement.append('<p class="text-muted">No tasks added yet. Add your first task below.</p>');
            return;
        }
        
        this.tasks.forEach(task => {
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
        
        $('.task-checkbox').on('change', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            this.updateTaskStatus(taskId, e.target.checked);
        });
        
        $('.delete-task').on('click', (e) => {
            const taskId = $(e.target).closest('.task-item').data('id');
            this.deleteTask(taskId);
        });
    }

    async handleAddTask() {
        const taskName = $('#newTaskInput').val().trim();
        if (taskName) {
            await DataService.addTask(taskName);
            $('#newTaskInput').val('');
            this.tasks = await DataService.loadTasks();
            this.renderTasks();
        }
    }

    async updateTaskStatus(taskId, isCompleted) {
        await DataService.updateTaskStatus(taskId, isCompleted);
        
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].completed = isCompleted;

            if (isCompleted && !this.firstTaskCompleted && this.routineStartTime) {
                this.firstTaskCompleted = true;
                const now = new Date();
                this.timeToFirstTask = (now - this.routineStartTime) - this.totalPausedTime;
            }
        }
        
        $(`#task-${taskId}`).closest('.task-item').toggleClass('task-done', isCompleted);
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            await DataService.deleteTask(taskId);
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderTasks();
        }
    }

    async loadInterruptions() {
        const interruptions = await DataService.loadInterruptions();
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

    startRoutine() {
        this.routineStartTime = new Date();
        this.isPaused = false;
        this.totalPausedTime = 0;
        this.lastPauseTime = null;
        
        this.updateButtonStates();
        $('#routineStatus').removeClass('alert-info').addClass('alert-warning')
            .html('Routine in progress... <span class="timer-running">Timer running</span>');

        this.tasks.forEach(task => {
            this.updateTaskStatus(task.id, false);
        });

        DataService.updateTimerState({
            running: true,
            paused: false,
            startTime: this.routineStartTime.toISOString(),
            totalPausedTime: 0
        });

        this.startTimerIntervals();
    }

    startTimerIntervals() {
        this.updateTimer();
        this.timerInterval = {
            display: setInterval(() => this.updateTimer(), 1000),
            sync: setInterval(() => this.syncTimerState(), 60000)
        };
    }

    updateTimer() {
        if (!this.routineStartTime || this.isPaused) return;

        const now = new Date();
        const elapsedMs = (now - this.routineStartTime) - this.totalPausedTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        $('#currentTimer').text(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );

        if (!this.firstTaskCompleted) {
            const firstTaskMinutes = Math.floor(elapsedMs / 60000);
            const firstTaskSeconds = Math.floor((elapsedMs % 60000) / 1000);
            $('#timeToFirstTask').text(
                `${firstTaskMinutes.toString().padStart(2, '0')}:${firstTaskSeconds.toString().padStart(2, '0')}`
            );
        }
    }

    async syncTimerState() {
        if (!this.routineStartTime) return;

        const now = new Date();
        const elapsedMs = (now - this.routineStartTime) - this.totalPausedTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        await DataService.updateTimerState({
            elapsedMinutes: minutes,
            elapsedSeconds: seconds,
            totalPausedTime: this.totalPausedTime,
            paused: this.isPaused
        });
    }

    restoreTimerState(state) {
        if (state && state.running) {
            this.routineStartTime = new Date(state.startTime);
            this.isPaused = state.paused || false;
            this.totalPausedTime = state.totalPausedTime || 0;
            
            if (this.isPaused && state.lastPauseTime) {
                this.lastPauseTime = new Date(state.lastPauseTime);
                this.showInterruptionForm();
            }
            
            this.updateButtonStates();
            
            if (this.isPaused) {
                $('#routineStatus').removeClass('alert-info').addClass('alert-warning')
                    .html('Routine paused... <span class="timer-paused">Timer paused</span>');
            } else {
                $('#routineStatus').removeClass('alert-info').addClass('alert-warning')
                    .html('Routine in progress... <span class="timer-running">Timer running</span>');
                this.startTimerIntervals();
            }
        }
    }

    updateButtonStates() {
        $('#startRoutine').prop('disabled', this.routineStartTime !== null);
        $('#completeRoutine').prop('disabled', !this.routineStartTime || this.isPaused);
        $('#pauseRoutine').prop('disabled', !this.routineStartTime || this.isPaused);
        $('#resumeRoutine').prop('disabled', !this.routineStartTime || !this.isPaused);
        
        if (this.routineStartTime) {
            if (this.isPaused) {
                $('#pauseRoutine').hide();
                $('#resumeRoutine').show();
            } else {
                $('#pauseRoutine').show();
                $('#resumeRoutine').hide();
            }
        }
    }

    pauseTimer() {
        if (!this.routineStartTime || this.isPaused) return;
        
        this.isPaused = true;
        this.lastPauseTime = new Date();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval.display);
            clearInterval(this.timerInterval.sync);
        }
        
        this.updateButtonStates();
        $('#routineStatus').html('Routine paused... <span class="timer-paused">Timer paused</span>');
        
        this.showInterruptionForm();
        
        DataService.updateTimerState({
            paused: true,
            lastPauseTime: this.lastPauseTime.toISOString()
        });
    }

    resumeTimer() {
        if (!this.routineStartTime || !this.isPaused) return;
        
        this.hideInterruptionForm();
        
        const now = new Date();
        const pauseDuration = now - this.lastPauseTime;
        this.totalPausedTime += pauseDuration;
        
        this.isPaused = false;
        this.lastPauseTime = null;
        this.currentInterruptionId = null;
        
        this.updateButtonStates();
        $('#routineStatus').html('Routine in progress... <span class="timer-running">Timer running</span>');
        
        DataService.updateTimerState({
            paused: false,
            totalPausedTime: this.totalPausedTime
        });
        
        this.startTimerIntervals();
    }

    async completeRoutine() {
        if (!this.routineStartTime || this.isPaused) return;

        if (this.timerInterval) {
            clearInterval(this.timerInterval.display);
            clearInterval(this.timerInterval.sync);
        }

        const endTime = new Date();
        const durationMinutes = Math.round(((endTime - this.routineStartTime) - this.totalPausedTime) / 60000);

        const completedCount = this.tasks.filter(task => task.completed).length;
        const completionPercent = this.tasks.length > 0 ? 
            Math.round((completedCount / this.tasks.length) * 100) : 0;

        const routineRecord = {
            date: new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            }),
            timestamp: Date.now(),
            durationMinutes: durationMinutes,
            tasksCompleted: completedCount,
            totalTasks: this.tasks.length,
            completionRate: completionPercent,
            totalPausedTimeMinutes: Math.round(this.totalPausedTime / 60000),
            timeToFirstTaskMs: this.timeToFirstTask
        };

        await DataService.saveRoutineRecord(routineRecord);
        await DataService.resetTimerState();

        this.routineStartTime = null;
        this.isPaused = false;
        this.totalPausedTime = 0;
        this.lastPauseTime = null;
        
        this.updateButtonStates();
        $('#routineStatus').removeClass('alert-warning').addClass('alert-success')
            .html(`Routine completed! <strong>${durationMinutes} minutes</strong> with ${completionPercent}% tasks completed`);

        const complianceData = await DataService.loadComplianceData();
        this.chartController.updateStats(complianceData);
        this.chartController.renderChart(complianceData);
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
        const duration = now - this.lastPauseTime;
        
        const interruption = {
            timestamp: now.getTime(),
            reason: reason,
            duration: duration,
            routineId: this.routineStartTime.getTime()
        };
        
        this.currentInterruptionId = await DataService.saveInterruption(interruption);
        this.hideInterruptionForm();
        await this.loadInterruptions();
    }
}