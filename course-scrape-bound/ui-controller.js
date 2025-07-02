// UIController.js - DOM manipulation and event handling
class UIController {
  constructor() {
    this.elements = {};
    this.selectedFile = null;
    this.analysisResults = null;
    this.imageDimensions = { width: 0, height: 0 };
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
        progressiveBtn: document.getElementById("progressiveBtn"),
        results: document.getElementById("results"),
        resultsContent: document.getElementById("resultsContent"),
        loading: document.getElementById("loading"),
        buttonOverlays: document.getElementById("buttonOverlays"),
        exportJson: document.getElementById("exportJson"),
        debugToggle: document.getElementById("debugToggle"),
        debugPanel: document.getElementById("debugPanel"),
        debugContent: document.getElementById("debugContent"),
        cycleViewer: document.getElementById("cycleViewer"),
      };

      // Validate required elements
      const requiredElements = [
        "apiKeyInput",
        "imageInput",
        "uploadArea",
        "imagePreview",
        "previewImg",
        "analyzeBtn",
        "progressiveBtn",
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

      console.log("UIController initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize UIController:", error);
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

    // Analysis buttons
    this.elements.analyzeBtn.addEventListener("click", () =>
      this.triggerAnalysis(false)
    );
    this.elements.progressiveBtn.addEventListener("click", () =>
      this.triggerAnalysis(true)
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
            console.log("Image dimensions:", this.imageDimensions);
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

  triggerAnalysis(useVisualFeedback = false) {
    // Dispatch custom event that the main app will listen to
    const event = new CustomEvent("analysisRequested", {
      detail: {
        useVisualFeedback,
        apiKey: this.elements.apiKeyInput.value.trim(),
        selectedFile: this.selectedFile,
        imageDimensions: this.imageDimensions,
      },
    });
    document.dispatchEvent(event);
  }

  // UI State Management
  showLoading(useVisualFeedback = false) {
    this.elements.loading.classList.remove("hidden");
    this.elements.results.classList.add("hidden");

    const loadingText = this.elements.loading.querySelector(".loading-text");
    if (loadingText) {
      if (useVisualFeedback) {
        loadingText.textContent =
          "Analyzing with Visual Feedback... This may take several API calls.";
      } else {
        loadingText.textContent = "Analyzing with GPT-4 Vision...";
      }
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

  // Results Display
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

      // Create results HTML
      const buttonsHtml = this.generateButtonsHTML(
        analysisResults.detected_buttons
      );
      const summaryHtml = this.generateSummaryHTML(analysisResults);
      const feedbackCyclesHtml = this.generateFeedbackCyclesHTML(
        analysisResults.feedback_cycles
      );

      this.elements.resultsContent.innerHTML =
        summaryHtml +
        feedbackCyclesHtml +
        '<div class="results-container">' +
        buttonsHtml +
        "</div>";

      // Add visual overlays
      this.addButtonOverlays(analysisResults.detected_buttons);
      this.showResults();
    } catch (error) {
      console.error("Error displaying results:", error);
      this.elements.resultsContent.innerHTML =
        '<div class="no-results">Error displaying results: ' +
        error.message +
        "</div>";
      this.showResults();
    }
  }

  generateButtonsHTML(buttons) {
    return buttons
      .map((button, index) => {
        const refinementBadge = button.refinement_level
          ? `<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded ml-2">Level ${button.refinement_level}</span>`
          : "";

        const regionInfo = button.crop_region
          ? `<div>Region: ${button.crop_region}</div>`
          : "";

        const errorInfo = button.slicing_error
          ? `<div class="text-red-600">⚠️ Slicing error occurred</div>`
          : "";

        return `
                <div class="result-item">
                    <div class="result-header">
                        <h4 class="result-name">${button.reference_name}</h4>
                        <div>
                            <span class="confidence-badge">${button.confidence}%</span>
                            ${refinementBadge}
                        </div>
                    </div>
                    <p class="result-description">${button.description}</p>
                    <div class="result-details">
                        <div>Type: ${button.element_type}</div>
                        <div>Center: (${button.center_coordinates.x}, ${button.center_coordinates.y})</div>
                        <div>Size: ${button.estimated_size.width}×${button.estimated_size.height}px</div>
                        ${regionInfo}
                        ${errorInfo}
                    </div>
                </div>
            `;
      })
      .join("");
  }

  generateSummaryHTML(analysisResults) {
    const methodBadge =
      analysisResults.analysis_method === "visual_feedback"
        ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Visual Feedback</span>'
        : analysisResults.analysis_method === "progressive_slicing"
        ? '<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Progressive Slicing</span>'
        : '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Standard Analysis</span>';

    const apiCallInfo = analysisResults.total_api_calls
      ? `<p class="text-xs text-blue-600 mt-1">API calls used: ${analysisResults.total_api_calls}</p>`
      : "";

    return `
            <div class="summary-box">
                <div class="flex justify-between items-start">
                    <h4 class="summary-title">Found ${analysisResults.detected_buttons.length} clickable elements</h4>
                    ${methodBadge}
                </div>
                <p class="summary-text">${analysisResults.analysis_summary.image_description}</p>
                ${apiCallInfo}
            </div>
        `;
  }

  generateFeedbackCyclesHTML(feedbackCycles) {
    if (!feedbackCycles || feedbackCycles.length === 0) {
      return "";
    }

    return `
            <div class="feedback-cycles-section">
                <h4 class="text-sm font-semibold mb-2">🔄 Feedback Cycles</h4>
                <div class="feedback-cycles-nav">
                    ${feedbackCycles
                      .map((cycle, index) => {
                        const statusIndicator = cycle.parsing_successful
                          ? "✅"
                          : "⚠️";
                        const statusClass = cycle.parsing_successful
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800";
                        return `<button class="cycle-btn ${
                          index === 0 ? "active" : ""
                        } ${statusClass}" onclick="showFeedbackCycle(${index})">
                            ${statusIndicator} Cycle ${cycle.cycle}
                        </button>`;
                      })
                      .join("")}
                </div>
                <div id="cycleViewer" class="cycle-viewer">
                    ${
                      feedbackCycles.length > 0
                        ? `<img src="${
                            feedbackCycles[0].overlayImageUrl
                          }" alt="Cycle 1" class="cycle-image" />
                         <p class="cycle-info">Cycle 1: ${
                           feedbackCycles[0].type === "initial_detection"
                             ? "Initial Detection"
                             : "Refinement"
                         } - ${feedbackCycles[0].buttons.length} buttons found
                         ${
                           feedbackCycles[0].parsing_successful
                             ? ""
                             : " (Parsing Failed)"
                         }</p>`
                        : "<p>No cycles available</p>"
                    }
                </div>
            </div>
        `;
  }

  addButtonOverlays(buttons) {
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

        // Different colors based on refinement level
        const dotColor =
          button.refinement_level && button.refinement_level > 0
            ? "bg-purple-500"
            : "bg-red-500";

        // Add error indicator
        const errorIndicator = button.slicing_error ? " ⚠️" : "";

        overlay.innerHTML = `
                    <div class="button-dot ${dotColor}"></div>
                    <div class="button-label">${button.reference_name}${errorIndicator}</div>
                `;

        this.elements.buttonOverlays.appendChild(overlay);
      });
    } catch (error) {
      console.error("Error adding button overlays:", error);
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
      a.download = "button_coordinates.json";
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      alert("Error exporting JSON: " + error.message);
    }
  }

  // Debug functionality
  toggleDebugMode() {
    const debugMode = this.elements.debugToggle
      ? this.elements.debugToggle.checked
      : false;

    if (this.elements.debugPanel) {
      this.elements.debugPanel.classList.toggle("hidden", !debugMode);
    }

    // Dispatch event for other components to react to debug mode change
    const event = new CustomEvent("debugModeChanged", {
      detail: { enabled: debugMode },
    });
    document.dispatchEvent(event);

    console.log("Debug mode:", debugMode ? "enabled" : "disabled");
  }

  updateDebugPanel(debugLogger) {
    if (!this.elements.debugContent) return;

    const logHtml = debugLogger.generateLogHTML();
    this.elements.debugContent.innerHTML = logHtml;
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

  // Validation methods
  validateInputs() {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      alert("Please enter your OpenAI API key");
      return false;
    }

    if (!this.selectedFile) {
      alert("Please select an image");
      return false;
    }

    return true;
  }

  // Error handling
  showError(message) {
    alert("Error: " + message);
  }

  showSuccess(message) {
    // Could implement a toast notification system here
    console.log("Success:", message);
  }
}

// Global function for feedback cycle viewer (called from generated HTML)
function showFeedbackCycle(cycleIndex) {
  // This function will be called from the main app
  const event = new CustomEvent("showFeedbackCycle", {
    detail: { cycleIndex },
  });
  document.dispatchEvent(event);
}
