// Simplified UIController.js - Single-Button Visual Feedback Only
class UIController {
  constructor() {
    this.elements = {};
    this.selectedFile = null;
    this.analysisResults = null;
    this.imageDimensions = { width: 0, height: 0 };
    this.currentDebugTab = "logs";
  }

  // Initialize DOM elements and event listeners
  initialize() {
    try {
      // Get DOM elements
      this.elements = {
        apiKeyInput: document.getElementById("apiKeyInput"),
        imageInput: document.getElementById("imageInput"),
        uploadArea: document.getElementById("uploadArea"),
        imagePreview: document.getElementById("imagePreview"),
        previewImg: document.getElementById("previewImg"),
        analyzeBtn: document.getElementById("analyzeBtn"),
        results: document.getElementById("results"),
        resultsContent: document.getElementById("resultsContent"),
        loading: document.getElementById("loading"),
        buttonOverlays: document.getElementById("buttonOverlays"),
        exportJson: document.getElementById("exportJson"),
        debugToggle: document.getElementById("debugToggle"),
        debugPanel: document.getElementById("debugPanel"),
        debugContent: document.getElementById("debugContent"),
        feedbackViewer: document.getElementById("feedbackViewer"),
      };

      // Validate required elements
      const requiredElements = [
        "apiKeyInput",
        "imageInput",
        "uploadArea",
        "imagePreview",
        "previewImg",
        "analyzeBtn",
        "results",
        "resultsContent",
        "loading",
        "buttonOverlays",
        "exportJson",
      ];

      for (const elementName of requiredElements) {
        if (!this.elements[elementName]) {
          throw new Error(`Required DOM element not found: ${elementName}`);
        }
      }

      // Add event listeners
      this.setupEventListeners();

      console.log(
        "✅ Simplified UIController initialized - Single-Button Mode Only"
      );
      return true;
    } catch (error) {
      console.error("Failed to initialize Simplified UIController:", error);
      alert("Failed to initialize application: " + error.message);
      return false;
    }
  }

  setupEventListeners() {
    // File upload events
    this.elements.uploadArea.addEventListener("click", () =>
      this.elements.imageInput.click()
    );
    this.elements.imageInput.addEventListener("change", (e) =>
      this.handleImageUpload(e)
    );

    // Single analysis button - always uses visual feedback
    this.elements.analyzeBtn.addEventListener("click", () =>
      this.triggerSingleButtonAnalysis()
    );

    // Export button
    this.elements.exportJson.addEventListener("click", () =>
      this.exportAsJson()
    );

    // Debug toggle
    if (this.elements.debugToggle) {
      this.elements.debugToggle.addEventListener("change", () =>
        this.toggleDebugMode()
      );
    }
  }

  handleImageUpload(event) {
    try {
      const file = event.target.files[0];
      if (file && file.type.startsWith("image/")) {
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.elements.previewImg.src = e.target.result;
          this.elements.previewImg.onload = () => {
            this.imageDimensions = {
              width: this.elements.previewImg.naturalWidth,
              height: this.elements.previewImg.naturalHeight,
            };
            console.log("📐 Image dimensions:", this.imageDimensions);
          };
          this.showImagePreview();
          this.hideResults();
          this.clearButtonOverlays();
        };
        reader.onerror = () => {
          alert("Failed to read image file");
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please select a valid image file");
      }
    } catch (error) {
      console.error("Error handling image upload:", error);
      alert("Error uploading image: " + error.message);
    }
  }

  triggerSingleButtonAnalysis() {
    console.log("🎯 Triggering Single-Button Visual Feedback Analysis");

    // Always use visual feedback mode - this is our only mode now
    const event = new CustomEvent("analysisRequested", {
      detail: {
        useVisualFeedback: true, // Always true - this is our only mode
        apiKey: this.elements.apiKeyInput.value.trim(),
        selectedFile: this.selectedFile,
        imageDimensions: this.imageDimensions,
      },
    });
    document.dispatchEvent(event);
  }

  // Simplified UI State Management
  showLoading() {
    this.elements.loading.classList.remove("hidden");
    this.elements.results.classList.add("hidden");

    const loadingText = this.elements.loading.querySelector(".loading-text");
    if (loadingText) {
      loadingText.innerHTML = `
        <div class="mode-confirmation">
          <div class="mode-confirmation-text">
            🎯 Starting Single-Button Visual Feedback Analysis...<br>
            Each button will be analyzed individually with systematic overlap detection and smart nudging
          </div>
        </div>
        Analyzing buttons individually... This may take several API calls.
      `;
    }
  }

  hideLoading() {
    this.elements.loading.classList.add("hidden");
  }

  showImagePreview() {
    this.elements.imagePreview.classList.remove("hidden");
  }

  hideResults() {
    this.elements.results.classList.add("hidden");
  }

  showResults() {
    this.elements.results.classList.remove("hidden");
  }

  clearButtonOverlays() {
    this.elements.buttonOverlays.innerHTML = "";
  }

  // Simplified Results Display - Single-Button Focus
  displayResults(analysisResults) {
    try {
      this.analysisResults = analysisResults;

      if (
        !analysisResults.detected_buttons ||
        analysisResults.detected_buttons.length === 0
      ) {
        this.elements.resultsContent.innerHTML =
          '<div class="no-results">No buttons detected in the image</div>';
        this.showResults();
        return;
      }

      this.clearButtonOverlays();

      // Create simplified results HTML focused on single-button analysis
      const modeConfirmationHtml =
        this.generateSingleButtonConfirmationHTML(analysisResults);
      const buttonsHtml = this.generateSingleButtonResultsHTML(
        analysisResults.detected_buttons
      );
      const summaryHtml = this.generateSimplifiedSummaryHTML(analysisResults);
      const feedbackCyclesHtml = this.generateSingleButtonFeedbackHTML(
        analysisResults.feedback_cycles
      );

      this.elements.resultsContent.innerHTML =
        modeConfirmationHtml +
        summaryHtml +
        feedbackCyclesHtml +
        '<div class="results-container">' +
        buttonsHtml +
        "</div>";

      // Add visual overlays with single-button indicators
      this.addSingleButtonOverlays(analysisResults.detected_buttons);
      this.showResults();
    } catch (error) {
      console.error("Error displaying single-button results:", error);
      this.elements.resultsContent.innerHTML =
        '<div class="analysis-error"><div class="analysis-error-text">Error displaying results: ' +
        error.message +
        "</div></div>";
      this.showResults();
    }
  }

  // Generate single-button mode confirmation
  generateSingleButtonConfirmationHTML(analysisResults) {
    if (
      analysisResults.analysis_method ===
      "single_button_visual_feedback_CONFIRMED"
    ) {
      return `
        <div class="mode-confirmation">
          <div class="mode-confirmation-text">
            ✅ CONFIRMED: Single-Button Individual Analysis Completed<br>
            Initial: ALL buttons detected → Refinement: EACH button analyzed individually
            ${
              analysisResults.processing_confirmation?.nudging_applied
                ? "| Smart Nudging Applied ✨"
                : ""
            }
          </div>
        </div>
      `;
    }
    return `
      <div class="mode-confirmation" style="background-color: #fef3c7; border-color: #f59e0b;">
        <div class="mode-confirmation-text" style="color: #92400e;">
          ⚠️ Analysis mode not confirmed as single-button processing
        </div>
      </div>
    `;
  }

  // Generate simplified summary focused on single-button results
  generateSimplifiedSummaryHTML(analysisResults) {
    const apiCallInfo = analysisResults.total_api_calls
      ? `<p class="text-xs text-blue-600 mt-1">🔄 API calls used: ${analysisResults.total_api_calls}</p>`
      : "";

    const processingInfo = analysisResults.processing_confirmation
      ? `<div class="text-xs text-gray-600 mt-2">
          <div>🎯 Mode: ${
            analysisResults.processing_confirmation.refinement_cycles ||
            "Single-Button Processing"
          }</div>
          <div>📝 Nudging: ${
            analysisResults.processing_confirmation.nudging_applied
              ? "✅ Applied"
              : "❌ Not needed"
          }</div>
        </div>`
      : "";

    return `
      <div class="summary-box">
        <div class="flex justify-between items-start">
          <h4 class="summary-title">🎯 Found ${analysisResults.detected_buttons.length} buttons with single-button analysis</h4>
          <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Single-Button Confirmed</span>
        </div>
        <p class="summary-text">${analysisResults.analysis_summary.image_description}</p>
        ${apiCallInfo}
        ${processingInfo}
      </div>
    `;
  }

  // Generate single-button focused results
  generateSingleButtonResultsHTML(buttons) {
    return buttons
      .map((button, index) => {
        const processingIndicator =
          button.processing_mode === "SINGLE_BUTTON_CONFIRMED"
            ? `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">🎯 Individual</span>`
            : "";

        const correctionInfo = button.correction_applied
          ? `<div class="text-green-600">✅ Smart nudging applied: ${
              button.correction_applied.nudge_type || "position adjustment"
            }</div>`
          : `<div class="text-blue-600">ℹ️ No correction needed - button well positioned</div>`;

        const confidenceClass =
          button.confidence >= 80
            ? "bg-green-100 text-green-800"
            : button.confidence >= 60
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800";

        return `
          <div class="result-item">
            <div class="result-header">
              <h4 class="result-name">🎯 ${button.reference_name}</h4>
              <div>
                <span class="confidence-badge ${confidenceClass}">${button.confidence}%</span>
                ${processingIndicator}
              </div>
            </div>
            <p class="result-description">${button.description}</p>
            <div class="result-details">
              <div>Type: ${button.element_type}</div>
              <div>Center: (${button.center_coordinates.x}, ${button.center_coordinates.y})</div>
              <div>Size: ${button.estimated_size.width}×${button.estimated_size.height}px</div>
              ${correctionInfo}
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Generate single-button feedback cycles display
  generateSingleButtonFeedbackHTML(feedbackCycles) {
    if (!feedbackCycles || feedbackCycles.length === 0) {
      return "";
    }

    return `
      <div class="feedback-cycles-section">
        <h4 class="text-sm font-semibold mb-2">🔄 Single-Button Analysis Cycles</h4>
        <div class="feedback-cycles-nav">
          ${feedbackCycles
            .map((cycle, index) => {
              const statusIndicator = cycle.parsing_successful ? "✅" : "⚠️";
              const statusClass = cycle.parsing_successful
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800";

              const individualIcon =
                cycle.individual_results?.length > 0 ? " 🎯" : "";
              const nudgingIcon = cycle.nudging_applied ? " 📝" : "";

              return `<button class="cycle-btn ${
                index === 0 ? "active" : ""
              } ${statusClass}" onclick="showFeedbackCycle(${index})">
                ${statusIndicator} Cycle ${
                cycle.cycle
              }${individualIcon}${nudgingIcon}
              </button>`;
            })
            .join("")}
        </div>
        <div id="cycleViewer" class="cycle-viewer">
          ${this.generateInitialCycleView(feedbackCycles[0])}
        </div>
      </div>
    `;
  }

  generateInitialCycleView(cycle) {
    if (!cycle) return "<p>No cycles available</p>";

    const individual_count = cycle.individual_results
      ? cycle.individual_results.length
      : 0;
    const successful_individual = cycle.individual_results
      ? cycle.individual_results.filter((r) => r.result.parsing_successful)
          .length
      : 0;

    return `
      <img src="${cycle.overlayImageUrl}" alt="Cycle 1" class="cycle-image" />
      <p class="cycle-info">
        🎯 Cycle 1: ${
          cycle.type === "initial_detection"
            ? "Initial Detection (ALL buttons)"
            : "Single-Button Refinement"
        } 
        - ${cycle.buttons.length} buttons
        ${
          individual_count > 0
            ? ` | Individual: ${successful_individual}/${individual_count} successful`
            : ""
        }
      </p>
    `;
  }

  // Single-button focused overlays
  addSingleButtonOverlays(buttons) {
    try {
      const scaleX =
        this.elements.previewImg.offsetWidth / this.imageDimensions.width;
      const scaleY =
        this.elements.previewImg.offsetHeight / this.imageDimensions.height;

      buttons.forEach((button, index) => {
        const x = button.center_coordinates.x * scaleX;
        const y = button.center_coordinates.y * scaleY;

        const overlay = document.createElement("div");
        overlay.className =
          "absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none";
        overlay.style.position = "absolute";
        overlay.style.left = x + "px";
        overlay.style.top = y + "px";
        overlay.style.transform = "translate(-50%, -50%)";

        // Single-button focused color coding
        let dotColor = "bg-green-500"; // Default for single-button processed
        if (button.correction_applied) {
          dotColor = "bg-blue-500"; // Nudging applied
        }

        // Single-button indicators
        const processingIcon = "🎯"; // Always show single-button icon
        const correctionIcon = button.correction_applied ? "📝" : "";

        overlay.innerHTML = `
          <div class="button-dot ${dotColor}"></div>
          <div class="button-label">${processingIcon} ${button.reference_name}${correctionIcon}</div>
        `;

        this.elements.buttonOverlays.appendChild(overlay);
      });
    } catch (error) {
      console.error("Error adding single-button overlays:", error);
    }
  }

  exportAsJson() {
    try {
      if (!this.analysisResults) {
        alert("No analysis results to export");
        return;
      }

      const jsonData = JSON.stringify(this.analysisResults, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `single_button_analysis_${new Date().getTime()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting single-button JSON:", error);
      alert("Error exporting JSON: " + error.message);
    }
  }

  // Simplified debug functionality
  toggleDebugMode() {
    const debugMode = this.elements.debugToggle
      ? this.elements.debugToggle.checked
      : false;

    if (this.elements.debugPanel) {
      this.elements.debugPanel.classList.toggle("hidden", !debugMode);

      if (debugMode) {
        console.log(
          "🔍 Debug mode enabled - Single-Button Analysis tracking active"
        );
        this.showSessionInfo();
      } else {
        console.log("🔍 Debug mode disabled");
      }
    }

    // Dispatch event for other components to react to debug mode change
    const event = new CustomEvent("debugModeChanged", {
      detail: { enabled: debugMode },
    });
    document.dispatchEvent(event);
  }

  showSessionInfo() {
    if (typeof debugLogger !== "undefined" && debugLogger.isEnabled()) {
      const sessionInfo = debugLogger.getAnalysisSession();
      const summary = debugLogger.getAnalysisSummary();

      if (sessionInfo || summary) {
        this.updateSessionInfoDisplay(sessionInfo, summary);
      }
    }
  }

  updateSessionInfoDisplay(sessionInfo, summary) {
    const debugContent = this.elements.debugContent;
    if (!debugContent) return;

    const sessionInfoHtml = `
      <div class="debug-session-info">
        <h4 style="color: #1e40af; font-weight: 600; margin-bottom: 0.75rem;">🎯 Single-Button Analysis Session</h4>
        <div class="session-meta">
          <div class="session-stat">
            <span class="session-stat-value">${
              sessionInfo?.llmCalls || 0
            }</span>
            <span class="session-stat-label">LLM Conversations</span>
          </div>
          <div class="session-stat">
            <span class="session-stat-value">${
              sessionInfo?.nudgingEvents || 0
            }</span>
            <span class="session-stat-label">Nudging Events</span>
          </div>
          <div class="session-stat">
            <span class="session-stat-value">Single-Button</span>
            <span class="session-stat-label">Analysis Mode</span>
          </div>
        </div>
        ${
          summary?.singleButtonAnalysis
            ? `
          <div style="margin-top: 0.75rem; font-size: 0.875rem; color: #374151;">
            <strong>🎯 Individual Processing:</strong> 
            ${summary.singleButtonAnalysis.successful}/${
                summary.singleButtonAnalysis.successful +
                summary.singleButtonAnalysis.failed
              } successful
            ${
              summary.singleButtonAnalysis.retries > 0
                ? ` (${summary.singleButtonAnalysis.retries} retries)`
                : ""
            }
          </div>
        `
            : ""
        }
      </div>
    `;

    // Prepend session info to debug content
    const existingContent = debugContent.innerHTML;
    debugContent.innerHTML = sessionInfoHtml + existingContent;
  }

  // Simplified debug panel update
  updateDebugPanel(debugLogger) {
    if (!this.elements.debugContent) return;

    const logHtml = debugLogger.generateLogHTML();

    // Include session info for single-button analysis
    const sessionInfo = debugLogger.getAnalysisSession();
    const summary = debugLogger.getAnalysisSummary();

    let sessionInfoHtml = "";
    if (sessionInfo || summary) {
      sessionInfoHtml = this.generateSingleButtonSessionHTML(
        sessionInfo,
        summary
      );
    }

    this.elements.debugContent.innerHTML = sessionInfoHtml + logHtml;
  }

  generateSingleButtonSessionHTML(sessionInfo, summary) {
    if (!sessionInfo && !summary) return "";

    return `
      <div class="debug-session-info">
        <h4 style="color: #1e40af; font-weight: 600; margin-bottom: 0.75rem;">🎯 Single-Button Analysis Summary</h4>
        <div class="session-meta">
          <div class="session-stat">
            <span class="session-stat-value">${
              summary?.llmConversations || 0
            }</span>
            <span class="session-stat-label">LLM Conversations</span>
          </div>
          <div class="session-stat">
            <span class="session-stat-value">${
              summary?.nudgingEvents || 0
            }</span>
            <span class="session-stat-label">Smart Nudges</span>
          </div>
          <div class="session-stat">
            <span class="session-stat-value">${
              summary?.singleButtonAnalysis?.successful || 0
            }</span>
            <span class="session-stat-label">Successful Analyses</span>
          </div>
        </div>
        <div style="margin-top: 0.75rem; font-size: 0.875rem; color: #374151;">
          <div><strong>🎯 Mode:</strong> Single-Button Individual Processing</div>
          ${
            sessionInfo?.startTime
              ? `<div><strong>⏱️ Started:</strong> ${new Date(
                  sessionInfo.startTime
                ).toLocaleTimeString()}</div>`
              : ""
          }
          ${
            sessionInfo?.duration
              ? `<div><strong>⏱️ Duration:</strong> ${Math.round(
                  sessionInfo.duration / 1000
                )}s</div>`
              : ""
          }
        </div>
      </div>
    `;
  }

  // Getters for component access
  getSelectedFile() {
    return this.selectedFile;
  }

  getImageDimensions() {
    return this.imageDimensions;
  }

  getApiKey() {
    return this.elements.apiKeyInput.value.trim();
  }

  // Simplified validation methods
  validateInputs() {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.showError("Please enter your OpenAI API key");
      return false;
    }

    if (!this.selectedFile) {
      this.showError("Please select an image");
      return false;
    }

    return true;
  }

  // Simplified error handling
  showError(message) {
    const errorHtml = `
      <div class="analysis-error">
        <div class="analysis-error-text">❌ ${message}</div>
      </div>
    `;

    if (this.elements.resultsContent) {
      this.elements.resultsContent.innerHTML = errorHtml;
      this.showResults();
    } else {
      alert("Error: " + message);
    }
  }

  showSuccess(message) {
    console.log("✅ Single-Button Success:", message);

    // Show temporary success notification
    const successHtml = `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; color: #166534;">
        ✅ ${message}
      </div>
    `;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = successHtml;
    tempDiv.style.position = "fixed";
    tempDiv.style.top = "20px";
    tempDiv.style.right = "20px";
    tempDiv.style.zIndex = "1000";
    document.body.appendChild(tempDiv);

    setTimeout(() => {
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    }, 3000);
  }
}

// Simplified global function for feedback cycle viewer
function showFeedbackCycle(cycleIndex) {
  const event = new CustomEvent("showFeedbackCycle", {
    detail: { cycleIndex },
  });
  document.dispatchEvent(event);
}
