// app.js - Main application orchestrator (refactored)
// This file coordinates all the components and handles the main application flow

class GPT4VisionButtonDetectorApp {
    constructor() {
        // Initialize all components
        this.debugLogger = new DebugLogger();
        this.imageProcessor = new ImageProcessor();
        this.uiController = new UIController();
        this.detector = null; // Will be initialized when API key is provided
        this.feedbackAnalyzer = null;
        this.progressiveSlicer = null;
    }

    async initialize() {
        try {
            // Initialize UI Controller
            const uiInitialized = this.uiController.initialize();
            if (!uiInitialized) {
                throw new Error('Failed to initialize UI Controller');
            }

            // Setup event listeners for component communication
            this.setupEventListeners();

            console.log('GPT-4 Vision Button Detector App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Failed to initialize application: ' + error.message);
        }
    }

    setupEventListeners() {
        // Listen for analysis requests from UI
        document.addEventListener('analysisRequested', (event) => {
            this.handleAnalysisRequest(event.detail);
        });

        // Listen for debug mode changes
        document.addEventListener('debugModeChanged', (event) => {
            this.handleDebugModeChange(event.detail.enabled);
        });

        // Listen for feedback cycle viewer requests
        document.addEventListener('showFeedbackCycle', (event) => {
            this.showFeedbackCycle(event.detail.cycleIndex);
        });

        // Setup debug tab switching (global function needed for HTML onclick)
        window.showDebugTab = (tabName) => {
            this.showDebugTab(tabName);
        };
    }

    async handleAnalysisRequest(requestData) {
        const { useVisualFeedback, apiKey, selectedFile, imageDimensions } = requestData;

        // Validate inputs
        if (!apiKey) {
            this.uiController.showError('Please enter your OpenAI API key');
            return;
        }

        if (!selectedFile) {
            this.uiController.showError('Please select an image');
            return;
        }

        try {
            // Initialize detector with API key (only when needed)
            this.detector = new GPT4VisionDetector(apiKey);
            this.feedbackAnalyzer = new FeedbackAnalyzer(this.detector, this.imageProcessor);
            this.progressiveSlicer = new ProgressiveSlicer(this.detector, this.imageProcessor);

            // Show loading state
            this.uiController.showLoading(useVisualFeedback);

            let analysisResults;

            if (useVisualFeedback) {
                console.log('🎯 Starting visual feedback analysis');
                analysisResults = await this.feedbackAnalyzer.analyzeWithVisualFeedback(selectedFile, imageDimensions);
            } else {
                console.log('📸 Starting standard analysis');
                analysisResults = await this.detector.analyzeImageForButtons(selectedFile);
                analysisResults.analysis_method = 'standard';
                analysisResults.total_api_calls = 1;
            }

            // Display results
            this.uiController.displayResults(analysisResults);

            // Update debug panel if enabled
            if (this.debugLogger.isEnabled()) {
                this.uiController.updateDebugPanel(this.debugLogger);
            }

            this.uiController.showSuccess('Analysis completed successfully');

        } catch (error) {
            console.error('Analysis error:', error);
            this.uiController.showError('Analysis failed: ' + error.message);
        } finally {
            this.uiController.hideLoading();
        }
    }

    handleDebugModeChange(enabled) {
        if (enabled) {
            this.debugLogger.enable();
            console.log('Debug logging enabled');
        } else {
            this.debugLogger.disable();
            console.log('Debug logging disabled');
        }
    }

    showFeedbackCycle(cycleIndex) {
        if (!this.uiController.analysisResults || !this.uiController.analysisResults.feedback_cycles) {
            console.warn('No feedback cycles available');
            return;
        }
        
        const cycles = this.uiController.analysisResults.feedback_cycles;
        if (cycleIndex < 0 || cycleIndex >= cycles.length) {
            console.warn('Invalid cycle index:', cycleIndex);
            return;
        }
        
        const cycle = cycles[cycleIndex];
        const cycleViewer = document.getElementById('cycleViewer');
        
        if (!cycleViewer) {
            console.warn('Cycle viewer element not found');
            return;
        }
        
        // Update active button
        document.querySelectorAll('.cycle-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index === cycleIndex);
        });
        
        // Create cycle display
        let cycleInfo = `Cycle ${cycle.cycle}: ${cycle.type === 'initial_detection' ? 'Initial Detection' : 'Refinement'} - ${cycle.buttons.length} buttons`;
        
        if (cycle.corrections && cycle.corrections.length > 0) {
            cycleInfo += ` (${cycle.corrections.length} corrections applied)`;
        }
        
        if (cycle.confidence) {
            cycleInfo += ` - Confidence: ${cycle.confidence}%`;
        }
        
        // Enhanced analysis display
        let analysisDetails = '';
        if (cycle.buttonAnalyses && cycle.buttonAnalyses.length > 0) {
            analysisDetails = `
                <div class="analysis-details">
                    <h5>Button Analysis:</h5>
                    <div class="analysis-grid">
                        ${cycle.buttonAnalyses.map(analysis => `
                            <div class="analysis-item">
                                <strong>Button ${analysis.button_number}</strong>
                                <div class="analysis-row">
                                    <span class="analysis-label">Coverage:</span>
                                    <span class="analysis-value ${analysis.coverage}">${analysis.coverage}</span>
                                </div>
                                <div class="analysis-row">
                                    <span class="analysis-label">Quadrants:</span>
                                    <span class="analysis-value">${analysis.quadrants_with_button ? analysis.quadrants_with_button.join(', ') : 'N/A'}</span>
                                </div>
                                <div class="analysis-row">
                                    <span class="analysis-label">Center:</span>
                                    <span class="analysis-value ${analysis.center_accurate}">${analysis.center_accurate}</span>
                                </div>
                                ${analysis.suggested_action && analysis.suggested_action !== 'none' ? 
                                    `<div class="analysis-row">
                                        <span class="analysis-label">Action:</span>
                                        <span class="analysis-value">${analysis.suggested_action}</span>
                                    </div>` : ''
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        cycleViewer.innerHTML = `
            <img src="${cycle.overlayImageUrl}" alt="Cycle ${cycle.cycle}" class="cycle-image" />
            <p class="cycle-info">${cycleInfo}</p>
            ${analysisDetails}
            ${cycle.corrections && cycle.corrections.length > 0 ? 
                `<div class="corrections-info">
                    <h5>Corrections Applied:</h5>
                    <ul>
                        ${cycle.corrections.map(corr => 
                            `<li>Button ${corr.button_number}: ${corr.issue}</li>`
                        ).join('')}
                    </ul>
                </div>` : ''
            }
        `;
    }

    showDebugTab(tabName) {
        // Hide all tab contents
        const debugLogs = document.getElementById('debugLogs');
        const debugCycles = document.getElementById('debugCycles');
        
        if (debugLogs) debugLogs.classList.add('hidden');
        if (debugCycles) debugCycles.classList.add('hidden');

        // Remove active class from all tabs
        document.querySelectorAll('.debug-tab').forEach((tab) => {
            tab.classList.remove('active');
        });

        // Show selected tab and mark as active
        if (tabName === 'logs' && debugLogs) {
            debugLogs.classList.remove('hidden');
            document.querySelectorAll('.debug-tab')[0]?.classList.add('active');
        } else if (tabName === 'cycles' && debugCycles) {
            debugCycles.classList.remove('hidden');
            document.querySelectorAll('.debug-tab')[1]?.classList.add('active');
            this.updateSliceViewer();
        }
    }

    updateSliceViewer() {
        const sliceViewer = document.getElementById('sliceViewer');
        if (!sliceViewer || !this.debugLogger.isEnabled()) return;
        
        const sliceVisualizations = this.imageProcessor.getSliceVisualizations();
        
        // Check if sliceVisualizations exists and has content
        if (!sliceVisualizations || sliceVisualizations.length === 0) {
            sliceViewer.innerHTML = '<p>No slices created yet. Run Progressive Slicing Analysis to see image crops.</p>';
            return;
        }
        
        const slicesHtml = sliceVisualizations.map(slice => {
            // Ensure slice has required properties
            if (!slice || !slice.id) return '';
            
            // Handle different slice types
            let buttonsInfo = '';
            if (slice.buttonsInRegion && Array.isArray(slice.buttonsInRegion)) {
                buttonsInfo = slice.buttonsInRegion.map(btn => 
                    `<div class="slice-button-info">
                        <strong>${btn.name || 'Unknown'}</strong> (${btn.confidence || 0}%)
                        <br>Original: (${btn.originalCoords ? btn.originalCoords.x : 'N/A'}, ${btn.originalCoords ? btn.originalCoords.y : 'N/A'})
                    </div>`
                ).join('');
            } else if (slice.buttonName) {
                buttonsInfo = `<div class="slice-button-info">
                    <strong>Searching for: ${slice.buttonName}</strong>
                    <br>Original: (${slice.originalCoords ? slice.originalCoords.x : 'N/A'}, ${slice.originalCoords ? slice.originalCoords.y : 'N/A'})
                </div>`;
            }
            
            return `
                <div class="slice-item">
                    <div class="slice-header">
                        <h4>Depth ${slice.depth || 0} - ${slice.region || slice.buttonName || 'Unknown'}</h4>
                        <span class="slice-time">${slice.timestamp ? new Date(slice.timestamp).toLocaleTimeString() : 'Unknown time'}</span>
                    </div>
                    <div class="slice-info">
                        <div>Crop: ${slice.cropBounds ? `${slice.cropBounds.x},${slice.cropBounds.y} (${slice.cropBounds.width}×${slice.cropBounds.height})` : 'Unknown bounds'}</div>
                        ${slice.searchingFor ? `<div>Searching for: ${slice.searchingFor}</div>` : ''}
                    </div>
                    <div class="slice-image-container">
                        ${slice.croppedImageUrl ? `<img src="${slice.croppedImageUrl}" alt="Slice ${slice.id}" class="slice-image" />` : '<div>No image available</div>'}
                        <div class="slice-buttons">
                            ${buttonsInfo}
                        </div>
                    </div>
                </div>
            `;
        }).filter(html => html !== '').join(''); // Filter out empty strings
        
        sliceViewer.innerHTML = slicesHtml || '<p>No valid slices to display</p>';
    }

    // Public methods for external access
    getDebugLogger() {
        return this.debugLogger;
    }

    getImageProcessor() {
        return this.imageProcessor;
    }

    getUIController() {
        return this.uiController;
    }

    // Method to run progressive slicing (if needed as separate option)
    async runProgressiveSlicing() {
        if (!this.uiController.validateInputs()) {
            return;
        }

        try {
            this.uiController.showLoading(false);
            
            const selectedFile = this.uiController.getSelectedFile();
            const imageDimensions = this.uiController.getImageDimensions();
            const apiKey = this.uiController.getApiKey();

            // Initialize detector if not already done
            if (!this.detector) {
                this.detector = new GPT4VisionDetector(apiKey);
                this.progressiveSlicer = new ProgressiveSlicer(this.detector, this.imageProcessor);
            }

            console.log('🔀 Starting progressive slicing analysis');
            const analysisResults = await this.progressiveSlicer.analyzeWithProgressiveSlicing(selectedFile, imageDimensions);

            this.uiController.displayResults(analysisResults);

            if (this.debugLogger.isEnabled()) {
                this.uiController.updateDebugPanel(this.debugLogger);
            }

        } catch (error) {
            console.error('Progressive slicing error:', error);
            this.uiController.showError('Progressive slicing failed: ' + error.message);
        } finally {
            this.uiController.hideLoading();
        }
    }
}

// Global application instance
let app;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    app = new GPT4VisionButtonDetectorApp();
    await app.initialize();
});

// Make debugLogger globally available for backward compatibility
let debugLogger;
document.addEventListener('DOMContentLoaded', () => {
    if (app) {
        debugLogger = app.getDebugLogger();
    }
});