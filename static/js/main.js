/**
 * Heart Disease Prediction System
 * Production-level JavaScript with error handling, validation, and UI enhancements
 */

// ==========================================
// DOM Elements
// ==========================================
class HeartDiseaseApp {
    constructor() {
        this.form = document.getElementById('predictionForm');
        this.resultContainer = document.getElementById('resultContainer');
        this.loadingOverlay = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupRealTimeValidation();
        this.createLoadingOverlay();
        this.setupCSRFToken();
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Add reset button listener if exists
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetForm());
        }
    }

    setupCSRFToken() {
        // Get CSRF token from meta tag
        const token = document.querySelector('meta[name="csrf-token"]');
        if (token) {
            this.csrfToken = token.getAttribute('content');
        }
    }

    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loadingOverlay';
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.style.display = 'none';
        this.loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Analyzing medical data...</p>
            </div>
        `;
        document.body.appendChild(this.loadingOverlay);
    }

    setupFormValidation() {
        // Add validation rules for each input
        const validationRules = {
            age: {
                validate: (value) => value >= 1 && value <= 120,
                message: 'Age must be between 1 and 120 years'
            },
            trestbps: {
                validate: (value) => value >= 80 && value <= 250,
                message: 'Blood pressure must be between 80-250 mm Hg'
            },
            chol: {
                validate: (value) => value >= 100 && value <= 600,
                message: 'Cholesterol must be between 100-600 mg/dL'
            },
            thalach: {
                validate: (value) => value >= 60 && value <= 250,
                message: 'Heart rate must be between 60-250 bpm'
            },
            oldpeak: {
                validate: (value) => value >= 0 && value <= 10,
                message: 'Oldpeak must be between 0.0-10.0'
            },
            ca: {
                validate: (value) => value >= 0 && value <= 4,
                message: 'Number of vessels must be between 0-4'
            }
        };

        // Apply validation to inputs
        Object.keys(validationRules).forEach(fieldName => {
            const input = this.form?.elements[fieldName];
            if (input) {
                input.addEventListener('blur', () => {
                    const value = parseFloat(input.value);
                    const rule = validationRules[fieldName];
                    
                    if (!rule.validate(value)) {
                        this.showError(input, rule.message);
                    } else {
                        this.clearError(input);
                    }
                });
            }
        });
    }

    setupRealTimeValidation() {
        // Real-time validation for number inputs
        const numberInputs = this.form?.querySelectorAll('input[type="number"]');
        numberInputs?.forEach(input => {
            input.addEventListener('input', () => {
                const value = parseFloat(input.value);
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                
                if (value < min) {
                    input.value = min;
                } else if (value > max) {
                    input.value = max;
                }
                
                // Update range display if exists
                this.updateRangeDisplay(input);
            });
        });
    }

    updateRangeDisplay(input) {
        const rangeId = `${input.name}Range`;
        const rangeDisplay = document.getElementById(rangeId);
        if (rangeDisplay) {
            rangeDisplay.textContent = input.value;
        }
    }

    showError(input, message) {
        // Remove existing error
        this.clearError(input);
        
        // Add error class
        input.classList.add('is-invalid');
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    clearError(input) {
        input.classList.remove('is-invalid');
        const errorDiv = input.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
        if (this.form) {
            this.form.style.opacity = '0.6';
            this.form.style.pointerEvents = 'none';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
        if (this.form) {
            this.form.style.opacity = '1';
            this.form.style.pointerEvents = 'auto';
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        // Validate form before submission
        if (!this.validateForm()) {
            this.showToast('Please fix validation errors before submitting', 'error');
            return;
        }
        
        this.showLoading();
        
        try {
            const formData = new FormData(this.form);
            const data = {};
            
            // Convert FormData to JSON
            for (let [key, value] of formData.entries()) {
                // Parse numeric values
                if (!isNaN(value) && value !== '') {
                    data[key] = parseFloat(value);
                } else {
                    data[key] = value;
                }
            }
            
            // Make API request
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken || ''
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.displayResult(result);
                this.animateResult();
                this.logToAnalytics(result);
            } else {
                this.showToast(result.error || 'Prediction failed', 'error');
            }
            
        } catch (error) {
            console.error('Prediction error:', error);
            this.showToast(error.message || 'Network error. Please try again.', 'error');
            
            // Log error to analytics
            this.logError(error);
            
        } finally {
            this.hideLoading();
        }
    }

    validateForm() {
        let isValid = true;
        const inputs = this.form?.querySelectorAll('input[required], select[required]');
        
        inputs?.forEach(input => {
            if (!input.value && input.value !== 0) {
                this.showError(input, 'This field is required');
                isValid = false;
            } else if (input.type === 'number') {
                const value = parseFloat(input.value);
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                
                if (value < min || value > max) {
                    this.showError(input, `Value must be between ${min} and ${max}`);
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }

    displayResult(result) {
        if (!this.resultContainer) return;
        
        // Create result HTML with animation
        const riskClass = result.prediction === 1 ? 'high-risk' : 'low-risk';
        const riskIcon = result.prediction === 1 ? '⚠️' : '✅';
        const riskTitle = result.prediction === 1 ? 'HIGH RISK: Heart Disease Detected' : 'LOW RISK: No Heart Disease Detected';
        const probabilityPercent = (result.probability * 100).toFixed(2);
        
        const resultHTML = `
            <div class="result-card ${riskClass} animate__animated animate__fadeInUp">
                <div class="result-header">
                    <h3>${riskIcon} ${riskTitle}</h3>
                </div>
                <div class="result-body">
                    <div class="probability-section">
                        <p class="probability-label">Heart Disease Probability</p>
                        <div class="probability-bar-container">
                            <div class="probability-bar ${riskClass}" style="width: ${probabilityPercent}%">
                                <span class="probability-text">${probabilityPercent}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recommendation-section">
                        <h5>Medical Recommendation</h5>
                        <p>${result.prediction === 1 ? 
                            '⚠️ Please consult a cardiologist immediately for further evaluation.' : 
                            '✅ Maintain a healthy lifestyle with regular exercise and balanced diet.'}
                        </p>
                    </div>
                    
                    <div class="additional-info">
                        <div class="info-item">
                            <strong>Confidence Score:</strong> 
                            <span class="confidence-value">${probabilityPercent}%</span>
                        </div>
                        <div class="info-item">
                            <strong>Risk Level:</strong> 
                            <span class="risk-badge ${riskClass}">${result.prediction === 1 ? 'High Risk' : 'Low Risk'}</span>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="window.print()">
                            🖨️ Print Report
                        </button>
                        <button class="btn btn-primary" onclick="location.reload()">
                            🔄 New Prediction
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.resultContainer.innerHTML = resultHTML;
        this.resultContainer.style.display = 'block';
        
        // Scroll to result
        this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Trigger animation for probability bar
        setTimeout(() => {
            const bar = document.querySelector('.probability-bar');
            if (bar) {
                bar.style.transition = 'width 1s ease-in-out';
            }
        }, 100);
    }

    animateResult() {
        // Add pulse animation to result container
        if (this.resultContainer) {
            this.resultContainer.classList.add('animate__animated', 'animate__pulse');
            setTimeout(() => {
                this.resultContainer.classList.remove('animate__animated', 'animate__pulse');
            }, 1000);
        }
    }

    showToast(message, type = 'info') {
        // Create toast container if not exists
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastId = `toast-${Date.now()}`;
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
                <div class="toast-header bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} text-white">
                    <strong class="me-auto">${type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Information'}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Remove toast after hiding
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
            this.resultContainer.style.display = 'none';
            this.resultContainer.innerHTML = '';
            
            // Clear all validation errors
            const invalidInputs = this.form.querySelectorAll('.is-invalid');
            invalidInputs.forEach(input => this.clearError(input));
            
            this.showToast('Form has been reset', 'info');
        }
    }

    logToAnalytics(result) {
        // Send analytics data to server (optional)
        if (navigator.sendBeacon) {
            const analyticsData = {
                timestamp: new Date().toISOString(),
                prediction: result.prediction,
                probability: result.probability,
                userAgent: navigator.userAgent
            };
            
            navigator.sendBeacon('/api/analytics', JSON.stringify(analyticsData));
        }
    }

    logError(error) {
        console.error('Application error:', error);
        // You can send error to your error tracking service here
        // e.g., Sentry, LogRocket, etc.
    }
}

// ==========================================
// Initialize Application
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    window.app = new HeartDiseaseApp();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const form = document.getElementById('predictionForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        // Escape to reset form
        if (e.key === 'Escape') {
            if (window.app && window.app.resetForm) {
                window.app.resetForm();
            }
        }
    });
});

// ==========================================
// Helper Functions for Range Sliders
// ==========================================
function updateRangeValue(inputId, value) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value;
        const displayId = `${inputId}Value`;
        const display = document.getElementById(displayId);
        if (display) {
            display.textContent = value;
        }
    }
}

// Export for testing (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HeartDiseaseApp };
}