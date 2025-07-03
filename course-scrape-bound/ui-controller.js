// UIController.js - Fixed UI with proper image display and restored debug panel
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

      console.log(
        "✅ Fixed UIController initialized with debug panel and image display"
      );
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
          Each button will be checked for alignment and nudged if needed (max 3 attempts each)<br>
          📸 Visual feedback will show bounding box progression for each attempt<br>
          🔍 Enable debug mode to see detailed LLM conversations
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

  // Enhanced display results with proper image display and debug info
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

      // Create enhanced results HTML with debug info
      const summaryHtml = this.generateEnhancedSummaryHTML(analysisResults);
      const debugInfoHtml = this.generateDebugInfoHTML(analysisResults);
      const visualProgressHtml = this.generateFixedVisualProgressHTML(
        analysisResults.detected_buttons
      );
      const buttonsHtml = this.generateEnhancedButtonsHTML(
        analysisResults.detected_buttons
      );

      this.elements.resultsContent.innerHTML =
        summaryHtml +
        debugInfoHtml +
        visualProgressHtml +
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

  // Generate debug info section
  generateDebugInfoHTML(analysisResults) {
    const debugInfo = [];
    if (
      analysisResults.detected_buttons &&
      analysisResults.detected_buttons.length > 0
    ) {
      const button = analysisResults.detected_buttons[0];
      if (button.alignment_history) {
        debugInfo.push(`🔍 Debug Info:`);
        debugInfo.push(
          `- Alignment attempts: ${button.alignment_history.length}`
        );
        debugInfo.push(`- Final status: ${button.final_status}`);
        button.alignment_history.forEach((attempt, index) => {
          const result = attempt.result;
          debugInfo.push(
            `- Attempt ${index + 1}: aligned=${result?.isAligned}, direction=${
              result?.direction
            }, overlayUrl=${attempt.overlayUrl ? "Generated" : "Missing"}`
          );
        });
      }
    }

    if (debugInfo.length > 0) {
      return `
        <div class="debug-info-section" style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0;">
          <div style="font-size: 0.875rem; color: #92400e;">
            ${debugInfo.map((info) => `<div>${info}</div>`).join("")}
          </div>
        </div>
      `;
    }
    return "";
  }

  // Generate enhanced summary with more details
  generateEnhancedSummaryHTML(analysisResults) {
    const summary = analysisResults.analysis_summary;
    const processing = analysisResults.processing_confirmation;

    return `
      <div class="summary-box">
        <div class="flex justify-between items-start">
          <h4 class="summary-title">🎯 Found ${
            summary.total_elements_found
          } buttons with simple alignment analysis</h4>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Enhanced Visual Feedback</span>
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
          <div>📸 Visual progression shown below for each button</div>
        </div>
      </div>
    `;
  }

  // Fixed visual progress section with better image handling
  generateFixedVisualProgressHTML(buttons) {
    let progressHtml = `
      <div class="visual-progress-section">
        <h4 class="section-title">🔍 Bounding Box Progression</h4>
        <p class="text-sm text-gray-600 mb-4">See how the bounding boxes evolved through each alignment attempt:</p>
    `;

    buttons.forEach((button, buttonIndex) => {
      if (button.alignment_history && button.alignment_history.length > 0) {
        progressHtml += `
          <div class="button-progress-container">
            <h5 class="font-semibold text-gray-800 mb-3">📦 ${button.reference_name}</h5>
            <div class="progress-attempts">
        `;

        button.alignment_history.forEach((attempt, attemptIndex) => {
          const attemptNumber = attemptIndex + 1;
          const isAligned = attempt.result?.isAligned || false;
          const direction = attempt.result?.direction || "none";
          const statusIcon = isAligned ? "✅" : "📝";
          const statusText = isAligned ? "Aligned" : `Move ${direction}`;
          const statusColor = isAligned ? "text-green-600" : "text-yellow-600";

          // Debug the overlay URL
          console.log(
            `🔍 Attempt ${attemptNumber} overlay URL:`,
            attempt.overlayUrl
          );

          progressHtml += `
            <div class="attempt-item">
              <div class="attempt-header">
                <span class="attempt-number">Attempt ${attemptNumber}</span>
                <span class="${statusColor}">${statusIcon} ${statusText}</span>
              </div>
              ${
                attempt.overlayUrl
                  ? `
                <div class="attempt-image-container">
                  <img src="${attempt.overlayUrl}" 
                       alt="Attempt ${attemptNumber}" 
                       class="attempt-image" 
                       onload="console.log('✅ Image ${attemptNumber} loaded successfully')"
                       onerror="console.error('❌ Image ${attemptNumber} failed to load:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                  <div class="image-error" style="display: none; background: #fef2f2; color: #991b1b; padding: 1rem; border-radius: 0.375rem; text-align: center;">
                    ❌ Image failed to load<br>
                    <small>URL: ${attempt.overlayUrl.substring(
                      0,
                      50
                    )}...</small>
                  </div>
                  <div class="attempt-details">
                    <div class="text-xs text-gray-600">
                      Direction: ${direction} | Aligned: ${
                      isAligned ? "Yes" : "No"
                    }
                      ${
                        attempt.bounding_box_at_attempt
                          ? `<br>Position: (${attempt.bounding_box_at_attempt.x}, ${attempt.bounding_box_at_attempt.y})`
                          : ""
                      }
                    </div>
                  </div>
                </div>
              `
                  : `
                <div class="text-xs text-red-500 bg-red-50 p-2 rounded">
                  ❌ No overlay image available for this attempt
                </div>
              `
              }
            </div>
          `;
        });

        progressHtml += `
            </div>
            <div class="final-status">
              <strong>Final Result:</strong> 
              <span class="${
                button.final_status === "aligned"
                  ? "text-green-600"
                  : "text-yellow-600"
              }">
                ${
                  button.final_status === "aligned"
                    ? "✅ Successfully Aligned"
                    : "⚠️ " + button.final_status.replace(/_/g, " ")
                }
              </span>
              ${
                button.nudge_history && button.nudge_history.length > 0
                  ? `
                <div class="text-xs text-gray-600 mt-2">
                  <strong>Nudging History:</strong>
                  ${button.nudge_history
                    .map(
                      (nudge, i) =>
                        `${i + 1}. ${nudge.direction} from (${nudge.from.x}, ${
                          nudge.from.y
                        }) to (${nudge.to.x}, ${nudge.to.y})`
                    )
                    .join("<br>")}
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `;
      }
    });

    progressHtml += `</div>`;
    return progressHtml;
  }

  // Generate enhanced button results with more details
  generateEnhancedButtonsHTML(buttons) {
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

        // Generate attempt details
        let attemptDetailsHtml = "";
        if (button.alignment_history && button.alignment_history.length > 0) {
          attemptDetailsHtml = `
            <div class="attempt-summary">
              <div class="text-xs font-semibold text-gray-700 mb-1">Alignment Attempts:</div>
              ${button.alignment_history
                .map((attempt, index) => {
                  const result = attempt.result;
                  const icon = result?.isAligned ? "✅" : "📝";
                  const status = result?.isAligned
                    ? "Aligned"
                    : `Move ${result?.direction || "unknown"}`;
                  return `<div class="text-xs text-gray-600">${
                    index + 1
                  }. ${icon} ${status}</div>`;
                })
                .join("")}
            </div>
          `;
        }

        return `
          <div class="result-item enhanced-result-item">
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
            ${attemptDetailsHtml}
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
      a.download = `enhanced_alignment_analysis_${new Date().getTime()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      alert("Error exporting JSON: " + error.message);
    }
  }

  // Fixed debug functionality
  toggleDebugMode() {
    const debugMode = this.elements.debugToggle
      ? this.elements.debugToggle.checked
      : false;

    if (this.elements.debugPanel) {
      this.elements.debugPanel.classList.toggle("hidden", !debugMode);

      if (debugMode) {
        console.log(
          "🔍 Debug mode enabled - Enhanced alignment tracking active"
        );

        // Show current debug content if available
        if (typeof debugLogger !== "undefined" && debugLogger.isEnabled()) {
          this.updateDebugPanel(debugLogger);
        }
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

    try {
      const logHtml = debugLogger.generateLogHTML();
      this.elements.debugContent.innerHTML =
        logHtml ||
        "<p>No debug logs available yet. Run analysis to see detailed information.</p>";

      console.log("🔍 Debug panel updated with logs");
    } catch (error) {
      console.error("Error updating debug panel:", error);
      this.elements.debugContent.innerHTML =
        "<p>Error loading debug logs: " + error.message + "</p>";
    }
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

// Global function for debug tab switching
function showDebugTab(tabName) {
  // Hide all tab contents
  const debugLogs = document.getElementById("debugLogs");
  const debugFeedback = document.getElementById("debugFeedback");

  if (debugLogs) debugLogs.classList.add("hidden");
  if (debugFeedback) debugFeedback.classList.add("hidden");

  // Remove active class from all tabs
  document.querySelectorAll(".debug-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Show selected tab and mark as active
  if (tabName === "logs" && debugLogs) {
    debugLogs.classList.remove("hidden");
    document.querySelectorAll(".debug-tab")[0]?.classList.add("active");
  } else if (tabName === "feedback" && debugFeedback) {
    debugFeedback.classList.remove("hidden");
    document.querySelectorAll(".debug-tab")[1]?.classList.add("active");
  }
}

// Global function for feedback cycle viewer (if needed)
function showFeedbackCycle(cycleIndex) {
  const event = new CustomEvent("showFeedbackCycle", {
    detail: { cycleIndex },
  });
  document.dispatchEvent(event);
}
