// app.js - Fixed app with proper debug logging and status tracking
class GPT4VisionButtonDetectorApp {
  constructor() {
    // Initialize core components for simple alignment
    this.debugLogger = new DebugLogger();
    this.imageProcessor = new ImageProcessor();
    this.uiController = new UIController();
    this.detector = null; // Will be initialized when API key is provided
    this.feedbackAnalyzer = null;

    // Analysis tracking for simple mode
    this.currentAnalysis = {
      mode: "simple_alignment",
      stage: null,
      buttonBeingProcessed: null,
      totalButtons: 0,
      processedButtons: 0,
    };
  }

  async initialize() {
    try {
      // Initialize UI Controller
      const uiInitialized = this.uiController.initialize();
      if (!uiInitialized) {
        throw new Error("Failed to initialize UI Controller");
      }

      // Setup event listeners for component communication
      this.setupEventListeners();

      console.log(
        "🎯 Fixed Simple Alignment Button Detector App initialized successfully"
      );

      // Show simple initialization info
      this.showFixedInitInfo();
    } catch (error) {
      console.error("Failed to initialize fixed app:", error);
      alert("Failed to initialize application: " + error.message);
    }
  }

  showFixedInitInfo() {
    console.log(`
🎯 FIXED SIMPLE ALIGNMENT BUTTON DETECTOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Mode: Fixed alignment checking with enhanced debugging
✅ Features: Detailed LLM logging, image display fixes, proper status tracking
✅ Process: 1) Detect all buttons 2) Check each individually 3) Show visual progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 FIXED ISSUES:
1. Enhanced LLM response parsing with fallback strategies
2. Fixed overlay image display in visual progress section
3. Restored debug panel functionality
4. Improved final status determination (aligned/max_attempts_reached)
5. Added detailed logging for troubleshooting

💡 Enable Debug Mode to see comprehensive LLM conversation logs!
    `);
  }

  setupEventListeners() {
    // Listen for analysis requests from UI
    document.addEventListener("analysisRequested", (event) => {
      this.handleFixedAnalysisRequest(event.detail);
    });

    // Listen for debug mode changes
    document.addEventListener("debugModeChanged", (event) => {
      this.handleDebugModeChange(event.detail.enabled);
    });

    // Listen for feedback cycle viewer requests (if any)
    document.addEventListener("showFeedbackCycle", (event) => {
      this.showFeedbackCycle(event.detail.cycleIndex);
    });

    // Setup debug tab switching
    window.showDebugTab = (tabName) => {
      this.showDebugTab(tabName);
    };

    // Add export function
    window.exportAnalysisReport = () => {
      this.exportFixedReport();
    };
  }

  async handleFixedAnalysisRequest(requestData) {
    const { apiKey, selectedFile, imageDimensions } = requestData;

    // Validate inputs
    if (!apiKey) {
      this.uiController.showError("Please enter your OpenAI API key");
      return;
    }

    if (!selectedFile) {
      this.uiController.showError("Please select an image");
      return;
    }

    try {
      // Initialize detector with API key
      this.detector = new GPT4VisionDetector(apiKey);
      this.feedbackAnalyzer = new FeedbackAnalyzer(
        this.detector,
        this.imageProcessor
      );

      // Update analysis tracking
      this.currentAnalysis = {
        mode: "fixed_simple_alignment",
        stage: "starting",
        buttonBeingProcessed: null,
        totalButtons: 0,
        processedButtons: 0,
        startTime: new Date(),
      };

      // Show loading state
      this.uiController.showLoading();

      console.log("🎯 STARTING: Fixed Simple Alignment Analysis");
      console.log("📋 ENHANCED PROCESS FLOW:");
      console.log("   1. 📸 Initial detection: ALL buttons analyzed together");
      console.log(
        "   2. 🎯 Individual alignment: EACH button checked separately with detailed logging"
      );
      console.log(
        "   3. 📝 Smart nudging: Fixed 20px movements with position tracking"
      );
      console.log(
        "   4. 📸 Visual feedback: Overlay images saved and displayed for each attempt"
      );
      console.log(
        "   5. 🔍 Debug logging: Comprehensive LLM conversation tracking"
      );
      console.log(
        "   6. ✅ Status tracking: Proper final status determination"
      );

      this.currentAnalysis.stage = "fixed_alignment_processing";

      // Use the enhanced visual feedback process with debugging
      const analysisResults =
        await this.feedbackAnalyzer.analyzeWithVisualFeedback(
          selectedFile,
          imageDimensions
        );

      // Enhanced verification with debugging info
      this.performEnhancedVerification(analysisResults);

      // Display results with debug info
      this.uiController.displayResults(analysisResults);

      // Update debug panel if enabled
      if (this.debugLogger.isEnabled()) {
        this.uiController.updateDebugPanel(this.debugLogger);
      }

      this.uiController.showSuccess(
        "Enhanced alignment analysis completed with debugging info"
      );

      // Log detailed completion summary
      this.logFixedAnalysisCompletion(analysisResults);
    } catch (error) {
      console.error("❌ Fixed alignment analysis error:", error);
      this.uiController.showError(
        "Fixed alignment analysis failed: " + error.message
      );

      // Enhanced error logging
      if (this.debugLogger.isEnabled()) {
        this.debugLogger.addLog("error", "Fixed Alignment Analysis Failed", {
          error: error.message,
          stack: error.stack,
          currentAnalysis: this.currentAnalysis,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      this.uiController.hideLoading();
      this.currentAnalysis.stage = "completed";
    }
  }

  // Enhanced verification with debugging details
  performEnhancedVerification(analysisResults) {
    console.log("\n" + "🔍".repeat(50));
    console.log("🔍 ENHANCED VERIFICATION WITH DEBUGGING");
    console.log("🔍".repeat(50));

    const verification = {
      method_confirmed:
        analysisResults.analysis_method?.includes("simple_alignment") || false,
      processing_mode:
        analysisResults.processing_confirmation?.mode?.includes(
          "SIMPLE_ALIGNMENT"
        ) || false,
      buttons_processed: analysisResults.detected_buttons?.length || 0,
      aligned_buttons: analysisResults.analysis_summary?.aligned_buttons || 0,
      success_rate: analysisResults.analysis_summary?.success_rate || 0,
      total_api_calls: analysisResults.total_api_calls || 0,
      max_attempts_per_button:
        analysisResults.processing_confirmation?.max_attempts_per_button || 3,
      debug_enabled: this.debugLogger.isEnabled(),
      llm_conversations: this.debugLogger.isEnabled()
        ? this.debugLogger.getLLMConversations().length
        : 0,
      visual_feedback: analysisResults.visual_feedback_summary || null,
    };

    // Check for common issues
    const issues = [];
    if (verification.success_rate === 0) {
      issues.push("No buttons successfully aligned - check LLM responses");
    }
    if (verification.llm_conversations === 0 && verification.debug_enabled) {
      issues.push("No LLM conversations logged despite debug being enabled");
    }
    if (!verification.visual_feedback) {
      issues.push(
        "No visual feedback summary - overlay generation may have failed"
      );
    }

    console.log(
      `🎯 Method: ${
        verification.method_confirmed ? "✅ CONFIRMED" : "❌ NOT CONFIRMED"
      }`
    );
    console.log(
      `🔄 Processing: ${
        verification.processing_mode ? "✅ CONFIRMED" : "❌ NOT CONFIRMED"
      }`
    );
    console.log(
      `📊 Results: ${verification.aligned_buttons}/${verification.buttons_processed} aligned (${verification.success_rate}%)`
    );
    console.log(`📞 API Calls: ${verification.total_api_calls}`);
    console.log(
      `🔄 Max Attempts: ${verification.max_attempts_per_button} per button`
    );
    console.log(
      `🔍 Debug Enabled: ${verification.debug_enabled ? "✅ YES" : "❌ NO"}`
    );
    console.log(`💬 LLM Conversations: ${verification.llm_conversations}`);
    console.log(
      `📸 Visual Feedback: ${
        verification.visual_feedback ? "✅ ENABLED" : "❌ DISABLED"
      }`
    );

    if (issues.length > 0) {
      console.log(`⚠️ Issues Found:`);
      issues.forEach((issue) => console.log(`   - ${issue}`));
    }

    // Detailed button analysis if debug enabled
    if (verification.debug_enabled && analysisResults.detected_buttons) {
      console.log(`\n📋 DETAILED BUTTON ANALYSIS:`);
      analysisResults.detected_buttons.forEach((button, index) => {
        console.log(`   Button ${index + 1}: ${button.reference_name}`);
        console.log(`   - Final Status: ${button.final_status}`);
        console.log(`   - Attempts: ${button.alignment_attempts}`);
        console.log(`   - Nudges: ${button.nudge_count}`);
        if (button.alignment_history) {
          console.log(
            `   - History: ${button.alignment_history
              .map(
                (h, i) =>
                  `Attempt ${i + 1}: ${
                    h.result?.isAligned
                      ? "aligned"
                      : h.result?.direction || "unknown"
                  }`
              )
              .join(", ")}`
          );
        }
      });
    }

    console.log("🔍".repeat(50));

    // Store enhanced verification results
    this.debugLogger.addLog(
      "enhanced-verification",
      "Fixed Alignment Process Verification",
      verification
    );

    return verification;
  }

  logFixedAnalysisCompletion(analysisResults) {
    const endTime = new Date();
    const duration = endTime - this.currentAnalysis.startTime;

    console.log("\n🎉 FIXED ALIGNMENT ANALYSIS COMPLETED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`🎯 Mode: Fixed Simple Alignment Process`);
    console.log(`📞 API Calls: ${analysisResults.total_api_calls || 1}`);
    console.log(
      `🎯 Buttons Found: ${analysisResults.detected_buttons?.length || 0}`
    );
    console.log(
      `✅ Successfully Aligned: ${
        analysisResults.analysis_summary?.aligned_buttons || 0
      }`
    );
    console.log(
      `📊 Success Rate: ${analysisResults.analysis_summary?.success_rate || 0}%`
    );
    console.log(
      `🔄 Total Alignment Attempts: ${
        analysisResults.analysis_summary?.total_alignment_attempts || 0
      }`
    );
    console.log(
      `📝 Total Nudges Applied: ${
        analysisResults.analysis_summary?.total_nudges_applied || 0
      }`
    );

    if (this.debugLogger.isEnabled()) {
      const summary = this.debugLogger.getAnalysisSummary();
      console.log(`💬 LLM Conversations: ${summary.llmConversations}`);
      console.log(`📝 Nudging Events: ${summary.nudgingEvents}`);
      console.log(`🔍 Debug Logs: ${summary.totalLogs}`);
    }

    // Visual feedback summary
    if (analysisResults.visual_feedback_summary) {
      const vfs = analysisResults.visual_feedback_summary;
      console.log(`📸 Visual Feedback:`);
      console.log(`   - Overlays Generated: ${vfs.total_overlays_generated}`);
      console.log(
        `   - Buttons with History: ${vfs.buttons_with_visual_history}`
      );
      console.log(
        `   - Avg Attempts/Button: ${vfs.average_attempts_per_button}`
      );
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  handleDebugModeChange(enabled) {
    if (enabled) {
      this.debugLogger.enable();
      console.log("🔍 Enhanced debug logging enabled");
      console.log("   ✅ LLM conversation tracking: ACTIVE");
      console.log("   ✅ Nudging event monitoring: ACTIVE");
      console.log("   ✅ Overlay generation tracking: ACTIVE");
      console.log("   ✅ Enhanced verification: ACTIVE");
    } else {
      this.debugLogger.disable();
      console.log("🔍 Debug logging disabled");
    }
  }

  showFeedbackCycle(cycleIndex) {
    // Enhanced feedback cycle display
    console.log(`🔄 Enhanced feedback cycle ${cycleIndex} requested`);
  }

  showDebugTab(tabName) {
    // Enhanced debug tab implementation
    console.log(`🔍 Enhanced debug tab ${tabName} requested`);

    // Call the global function for proper tab switching
    if (typeof showDebugTab === "function") {
      showDebugTab(tabName);
    }
  }

  // Export enhanced analysis report with debugging info
  exportFixedReport() {
    if (!this.uiController.analysisResults) {
      alert("No analysis results available to export");
      return;
    }

    const report = {
      timestamp: new Date().toISOString(),
      analysis_type: "fixed_simple_alignment_with_debugging",
      results: this.uiController.analysisResults,
      verification: this.performEnhancedVerification(
        this.uiController.analysisResults
      ),
      debug_summary: this.debugLogger.isEnabled()
        ? this.debugLogger.getAnalysisSummary()
        : null,
      session_info: this.debugLogger.isEnabled()
        ? this.debugLogger.getAnalysisSession()
        : null,
      llm_conversations: this.debugLogger.isEnabled()
        ? this.debugLogger.getLLMConversations()
        : null,
      nudging_events: this.debugLogger.isEnabled()
        ? this.debugLogger.getNudgingEvents()
        : null,
      debugging_notes: {
        image_display_fixed:
          "Overlay images now properly display in visual progress section",
        parsing_enhanced:
          "Multiple fallback strategies for LLM response parsing",
        status_tracking_improved: "Proper final status determination logic",
        logging_comprehensive:
          "Detailed logging of all alignment attempts and LLM responses",
      },
    };

    const jsonData = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `fixed_alignment_report_${new Date().getTime()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    console.log("📄 Fixed alignment analysis report exported successfully");
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

  // Method to get current analysis status
  getAnalysisStatus() {
    return {
      mode: "fixed_simple_alignment_with_debugging",
      current_analysis: this.currentAnalysis,
      available_features: [
        "Enhanced button detection",
        "Improved alignment checking with fallback parsing",
        "Fixed overlay image display",
        "Comprehensive debug logging",
        "Visual progress tracking",
        "Proper status determination",
        "Fixed 20px nudging with position tracking",
        "Max 3 attempts per button",
      ],
      process_flow: [
        "1. Detect all buttons in image (1 API call)",
        "2. For each button: check alignment with enhanced logging",
        "3. Parse LLM response with multiple fallback strategies",
        "4. If not aligned: nudge 20px and track position change",
        "5. Generate overlay image and store URL for display",
        "6. Repeat max 3 times per button",
        "7. Determine final status (aligned/max_attempts_reached)",
        "8. Display visual progress with working overlay images",
      ],
      debugging_features: [
        "Detailed LLM conversation logging",
        "Enhanced response parsing with fallback strategies",
        "Visual overlay image display in progress section",
        "Comprehensive error tracking",
        "Position change tracking for nudging",
        "Debug panel with proper tab switching",
      ],
    };
  }
}

// Global application instance
let app;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  app = new GPT4VisionButtonDetectorApp();
  await app.initialize();
});

// Make debugLogger globally available for backward compatibility
let debugLogger;
document.addEventListener("DOMContentLoaded", () => {
  if (app) {
    debugLogger = app.getDebugLogger();
  }
});

// Global functions for UI interaction
window.exportAnalysisReport = () => {
  if (app) {
    app.exportFixedReport();
  } else {
    alert("Application not initialized yet");
  }
};

window.getAnalysisStatus = () => {
  if (app) {
    return app.getAnalysisStatus();
  } else {
    return { error: "Application not initialized" };
  }
};

// Add helpful console commands for debugging
console.log(`
🎯 FIXED SIMPLE ALIGNMENT BUTTON DETECTOR LOADED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available console commands:
• getAnalysisStatus() - Get current app status with debugging info
• exportAnalysisReport() - Export comprehensive analysis report
• debugLogger.getAnalysisSummary() - Get debug summary
• app.getDebugLogger().getLLMConversations() - View LLM conversations
• app.getDebugLogger().getNudgingEvents() - View nudging events

🔧 FIXES IMPLEMENTED:
✅ Enhanced LLM response parsing with fallback strategies
✅ Fixed overlay image display in visual progress section  
✅ Restored debug panel functionality with proper tab switching
✅ Improved final status determination logic
✅ Added comprehensive logging for troubleshooting

🎯 This version includes extensive debugging and visual feedback!
`);
