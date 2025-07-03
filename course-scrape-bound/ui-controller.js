// UIController.js - Simplified UI for simple alignment process
class UIController {
  constructor() {
    this.elements = {};
    this.selectedFile = null;
    this.analysisResults = null;
    this.imageDimensions = { width: 0, height: 0 };
    this.currentDebugTab = "logs";
    this.config = null;
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

      // Try to load config file with API key
      this.loadConfigFile();

      // Add event listeners
      this.setupEventListeners();

      console.log("✅ Simplified UIController initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize UIController:", error);
      alert("Failed to initialize application: " + error.message);
      return false;
    }
  }

  // Load config file if available
  async loadConfigFile() {
    try {
      console.log("🔑 Attempting to load local.config.json...");
      const response = await fetch("./local.config.json");

      if (response.ok) {
        const config = await response.json();
        console.log("✅ Config file loaded successfully");

        if (config.apiKey && config.settings?.autoLoadKey !== false) {
          this.elements.apiKeyInput.value = config.apiKey;
          console.log("🔑 API key auto-loaded from config");
          this.showConfigLoadedIndicator();
        }

        if (config.settings?.debugMode === true && this.elements.debugToggle) {
          this.elements.debugToggle.checked = true;
          this.toggleDebugMode();
          console.log("🔍 Debug mode auto-enabled from config");
        }

        this.config = config;
      } else if (response.status === 404) {
        console.log("ℹ️ No local.config.json file found - this is optional");
      }
    } catch (error) {
      console.log(
        "ℹ️ Config file not available - this is optional:",
        error.message
      );
    }
  }

  // Show indicator that config was loaded
  showConfigLoadedIndicator() {
    const indicator = document.createElement("div");
    indicator.innerHTML = "🔑 API key loaded from local.config.json";
    indicator.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #dcfce7; color: #166534;
      padding: 8px 16px; border-radius: 6px; border: 1px solid #bbf7d0; font-size: 14px;
      z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    document.body.appendChild(indicator);
    setTimeout(() => {
      if (document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    }, 3000);
  }

  setupEventListeners() {
    // File upload events
    this.elements.uploadArea.addEventListener("click", () =>
      this.elements.imageInput.click()
    );
    this.elements.imageInput.addEventListener("change", (e) =>
      this.handleImageUpload(e)
    );

    // Simple analysis button
    this.elements.analyzeBtn.addEventListener("click", () =>
      this.triggerSimpleAnalysis()
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
        reader.onerror = () => alert("Failed to read image file");
        reader.readAsDataURL(file);
      } else {
        alert("Please select a valid image file");
      }
    } catch (error) {
      console.error("Error handling image upload:", error);
      alert("Error uploading image: " + error.message);
    }
  }

  triggerSimpleAnalysis() {
    console.log("🎯 Triggering Simple Alignment Analysis");

    const event = new CustomEvent("analysisRequested", {
      detail: {
        useVisualFeedback: true, // Always use visual feedback
        apiKey: this.elements.apiKeyInput.value.trim(),
        selectedFile: this.selectedFile,
        imageDimensions: this.imageDimensions,
        config: this.config,
      },
    });
    document.dispatchEvent(event);
  }

  // UI State Management
  showLoading() {
    this.elements.loading.classList.remove("hidden");
    this.elements.results.classList.add("hidden");

    const loadingText = this.elements.loading.querySelector(".loading-text");
    if (loadingText) {
      loadingText.innerHTML = `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; color: #166534;">
          🎯 Starting Simple Alignment Analysis...<br>
          Each button will be checked for alignment and nudged if needed (max 3 attempts each)
        </div>
        Analyzing buttons with simple alignment process...
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

  // Display Results
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

      // Create simple results HTML
      const summaryHtml = this.generateSimpleSummaryHTML(analysisResults);
      const buttonsHtml = this.generateSimpleButtonsHTML(
        analysisResults.detected_buttons
      );

      this.elements.resultsContent.innerHTML =
        summaryHtml +
        '<div class="results-container">' +
        buttonsHtml +
        "</div>";

      // Add simple overlays
      this.addSimpleOverlays(analysisResults.detected_buttons);
      this.showResults();
    } catch (error) {
      console.error("Error displaying results:", error);
      this.elements.resultsContent.innerHTML =
        '<div class="analysis-error"><div class="analysis-error-text">Error displaying results: ' +
        error.message +
        "</div></div>";
      this.showResults();
    }
  }

  // Generate simple summary
  generateSimpleSummaryHTML(analysisResults) {
    const summary = analysisResults.analysis_summary;
    const processing = analysisResults.processing_confirmation;

    return `
      <div class="summary-box">
        <div class="flex justify-between items-start">
          <h4 class="summary-title">🎯 Found ${
            summary.total_elements_found
          } buttons with simple alignment</h4>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Simple Process</span>
        </div>
        <p class="summary-text">${summary.image_description}</p>
        <div class="text-xs text-gray-600 mt-2">
          <div>✅ Successfully aligned: ${summary.aligned_buttons}/${
      summary.total_elements_found
    } (${summary.success_rate}%)</div>
          <div>🔄 Total alignment attempts: ${
            summary.total_alignment_attempts
          }</div>
          <div>📞 API calls used: ${analysisResults.total_api_calls}</div>
          <div>📝 Max attempts per button: ${
            processing?.max_attempts_per_button || 3
          }</div>
        </div>
      </div>
    `;
  }

  // Generate simple button results
  generateSimpleButtonsHTML(buttons) {
    return buttons
      .map((button) => {
        const statusIcon = button.final_status === "aligned" ? "✅" : "⚠️";
        const statusColor =
          button.final_status === "aligned"
            ? "text-green-600"
            : "text-yellow-600";

        const confidenceClass =
          button.confidence >= 80
            ? "bg-green-100 text-green-800"
            : button.confidence >= 60
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800";

        return `
          <div class="result-item">
            <div class="result-header">
              <h4 class="result-name">${statusIcon} ${
          button.reference_name
        }</h4>
              <div>
                <span class="confidence-badge ${confidenceClass}">${
          button.confidence
        }%</span>
              </div>
            </div>
            <p class="result-description">${button.description}</p>
            <div class="result-details">
              <div>Type: ${button.element_type}</div>
              <div>Final Position: (${button.center_coordinates.x}, ${
          button.center_coordinates.y
        })</div>
              <div>Size: ${button.estimated_size.width}×${
          button.estimated_size.height
        }px</div>
              <div class="${statusColor}">Status: ${button.final_status.replace(
          /_/g,
          " "
        )}</div>
              <div>Alignment attempts: ${button.alignment_attempts}</div>
              <div>Nudges applied: ${button.nudge_count}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Add simple overlays
  addSimpleOverlays(buttons) {
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

        // Color based on final status
        let dotColor = "bg-green-500"; // aligned
        if (button.final_status !== "aligned") {
          dotColor = "bg-yellow-500"; // not aligned
        }

        const statusIcon = button.final_status === "aligned" ? "✅" : "⚠️";

        overlay.innerHTML = `
          <div class="button-dot ${dotColor}"></div>
          <div class="button-label">${statusIcon} ${button.reference_name}</div>
        `;

        this.elements.buttonOverlays.appendChild(overlay);
      });
    } catch (error) {
      console.error("Error adding overlays:", error);
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
      a.download = `simple_alignment_analysis_${new Date().getTime()}.json`;
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

      if (debugMode) {
        console.log("🔍 Debug mode enabled - Simple alignment tracking active");
      } else {
        console.log("🔍 Debug mode disabled");
      }
    }

    // Dispatch event for other components
    const event = new CustomEvent("debugModeChanged", {
      detail: { enabled: debugMode },
    });
    document.dispatchEvent(event);
  }

  updateDebugPanel(debugLogger) {
    if (!this.elements.debugContent) return;

    const logHtml = debugLogger.generateLogHTML();
    this.elements.debugContent.innerHTML = logHtml;
  }

  // Validation and error handling
  validateInputs() {
    const apiKey = this.elements.apiKeyInput.value.trim();
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
    console.log("✅ Success:", message);

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

  // Getters
  getSelectedFile() {
    return this.selectedFile;
  }

  getImageDimensions() {
    return this.imageDimensions;
  }

  getApiKey() {
    return this.elements.apiKeyInput.value.trim();
  }

  getConfig() {
    return this.config;
  }
}

// Global function for feedback cycle viewer (if needed)
function showFeedbackCycle(cycleIndex) {
  const event = new CustomEvent("showFeedbackCycle", {
    detail: { cycleIndex },
  });
  document.dispatchEvent(event);
}
