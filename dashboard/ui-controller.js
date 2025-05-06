class UIController {
    constructor() {
        this.currentSection = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Handle sidebar navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.getAttribute('href').substring(1);
                this.showSection(sectionId);
            });
        });

        // Show initial section
        this.showSection('current-task');
    }

    showSection(sectionId) {
        // Update active state in sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });

        // Show selected section, hide others
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = section.id === sectionId ? 'block' : 'none';
        });

        this.currentSection = sectionId;
    }

    // Method to show loading state
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        }
    }

    // Method to show error message
    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
        }
    }
}

// Create global instance
const uiController = new UIController();