// Simplified app.js - Single-Button Visual Feedback Analysis Only
class GPT4VisionButtonDetectorApp {
  constructor() {
    // Initialize core components for single-button analysis
    this.debugLogger = new DebugLogger();
    this.imageProcessor = new ImageProcessor();
    this.uiController = new UIController();
    this.detector = null; // Will be initialized when API key is provided
    this.feedbackAnalyzer = null;

    // Analysis tracking for single-button mode
    this.currentAnalysis = {
      mode: "single_button_visual_feedback",
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
        "🎯 Single-Button GPT-4 Vision Detector App initialized successfully"
      );

      // Show simplified initialization info
      this.showSingleButtonInitInfo();
    } catch (error) {
      console.error("Failed to initialize single-button app:", error);
      alert("Failed to initialize application: " + error.message);
    }
  }

  showSingleButtonInitInfo() {
    console.log(`
🎯 SINGLE-BUTTON VISUAL FEEDBACK ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Mode: Individual button processing with smart nudging
✅ Features: LLM conversation tracking, systematic overlap analysis
✅ Debug: Enhanced logging for verification and troubleshooting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 HOW IT WORKS:
1. Initial Detection: Analyzes ALL buttons together (1 API call)
2. Individual Refinement: Each button analyzed separately with overlay
3. Systematic Analysis: Overlap detection, quadrant mapping, positioning
4. Smart Nudging: Intelligent position corrections based on analysis
5. Verification: Comprehensive tracking and validation

💡 Enable Debug Mode to see detailed LLM conversations and nudging events!
    `);
  }

  setupEventListeners() {
    // Listen for analysis requests from UI (only single-button mode now)
    document.addEventListener("analysisRequested", (event) => {
      this.handleSingleButtonAnalysisRequest(event.detail);
    });

    // Listen for debug mode changes
    document.addEventListener("debugModeChanged", (event) => {
      this.handleDebugModeChange(event.detail.enabled);
    });

    // Listen for feedback cycle viewer requests
    document.addEventListener("showFeedbackCycle", (event) => {
      this.showFeedbackCycle(event.detail.cycleIndex);
    });

    // Setup debug tab switching
    window.showDebugTab = (tabName) => {
      this.showDebugTab(tabName);
    };

    // Add export enhanced logs function
    window.exportAnalysisReport = () => {
      this.exportSingleButtonReport();
    };
  }

  async handleSingleButtonAnalysisRequest(requestData) {
    const { apiKey, selectedFile, imageDimensions } = requestData;
    // Note: useVisualFeedback is always true now - it's our only mode

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
        mode: "single_button_visual_feedback",
        stage: "starting",
        buttonBeingProcessed: null,
        totalButtons: 0,
        processedButtons: 0,
        startTime: new Date(),
      };

      // Show loading state
      this.uiController.showLoading();

      console.log("🎯 STARTING: Single-Button Visual Feedback Analysis");
      console.log("📋 PROCESS FLOW:");
      console.log("   1. 📸 Initial detection: ALL buttons analyzed together");
      console.log(
        "   2. 🎯 Individual refinement: EACH button analyzed separately"
      );
      console.log(
        "   3. 📝 Smart nudging: Position adjustments based on systematic analysis"
      );
      console.log(
        "   4. ✅ Verification: Confirm single-button processing occurred"
      );

      this.currentAnalysis.stage = "single_button_processing";

      const analysisResults =
        await this.feedbackAnalyzer.analyzeWithVisualFeedback(
          selectedFile,
          imageDimensions
        );

      // Verify single-button mode was used correctly
      this.verifySingleButtonProcessing(analysisResults);

      // Perform final verification addressing the 5 key questions
      this.performComprehensiveVerification(analysisResults);

      // Display results
      this.uiController.displayResults(analysisResults);

      // Update debug panel if enabled
      if (this.debugLogger.isEnabled()) {
        this.uiController.updateDebugPanel(this.debugLogger);
      }

      this.uiController.showSuccess(
        "Single-button analysis completed successfully"
      );

      // Log completion summary
      this.logSingleButtonCompletion(analysisResults);
    } catch (error) {
      console.error("❌ Single-button analysis error:", error);
      this.uiController.showError(
        "Single-button analysis failed: " + error.message
      );

      // Log error details
      if (this.debugLogger.isEnabled()) {
        this.debugLogger.addLog("error", "Single-Button Analysis Failed", {
          error: error.message,
          stack: error.stack,
          currentAnalysis: this.currentAnalysis,
        });
      }
    } finally {
      this.uiController.hideLoading();
      this.currentAnalysis.stage = "completed";
    }
  }

  // COMPREHENSIVE VERIFICATION - Answers all 5 key questions
  performComprehensiveVerification(analysisResults) {
    console.log("\n" + "🎯".repeat(40));
    console.log("🔍 SINGLE-BUTTON ANALYSIS VERIFICATION");
    console.log("Comprehensive check of all 5 key implementation questions");
    console.log("🎯".repeat(40));

    const verification = {
      question1_llm_visibility: this.verifyLLMVisibility(),
      question2_single_button_focus:
        this.verifySingleButtonProcessing(analysisResults),
      question3_nudging_behavior: this.verifyNudgingBehavior(analysisResults),
      question4_prompt_effectiveness: this.analyzePromptEffectiveness(),
      question5_implementation_health:
        this.performImplementationHealthCheck(analysisResults),
      overall_score: "calculating...",
    };

    // Calculate overall score
    const scores = {
      llm_visible: verification.question1_llm_visibility.visible ? 1 : 0,
      single_button_confirmed: verification.question2_single_button_focus
        .mode_confirmed
        ? 1
        : 0,
      nudging_working:
        verification.question3_nudging_behavior.nudging_events > 0 ? 1 : 0.5, // 0.5 if not needed
      prompts_effective:
        verification.question4_prompt_effectiveness.success_rate > 0.7
          ? 1
          : 0.5,
      no_critical_issues:
        verification.question5_implementation_health.critical_issues.length ===
        0
          ? 1
          : 0,
    };

    const totalScore =
      Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.keys(scores).length;
    verification.overall_score =
      totalScore >= 0.8
        ? "EXCELLENT"
        : totalScore >= 0.6
        ? "GOOD"
        : totalScore >= 0.4
        ? "FAIR"
        : "NEEDS_IMPROVEMENT";

    console.log("\n" + "📊".repeat(40));
    console.log("📊 VERIFICATION RESULTS SUMMARY");
    console.log("📊".repeat(40));
    console.log(
      `🎯 Overall Score: ${verification.overall_score} (${Math.round(
        totalScore * 100
      )}%)`
    );
    console.log(
      `1. 👁️  LLM Visibility: ${
        verification.question1_llm_visibility.visible
          ? "✅ WORKING"
          : "❌ DISABLED"
      }`
    );
    console.log(
      `2. 🎯 Single-Button Focus: ${
        verification.question2_single_button_focus.mode_confirmed
          ? "✅ CONFIRMED"
          : "❌ NOT CONFIRMED"
      }`
    );
    console.log(
      `3. 📝 Smart Nudging: ${
        verification.question3_nudging_behavior.nudging_events > 0
          ? "✅ ACTIVE"
          : "ℹ️ NOT NEEDED"
      }`
    );
    console.log(
      `4. 📋 Prompt Effectiveness: ${
        verification.question4_prompt_effectiveness.success_rate > 0.7
          ? "✅ EXCELLENT"
          : "⚠️ NEEDS WORK"
      }`
    );
    console.log(
      `5. 🏥 Implementation Health: ${
        verification.question5_implementation_health.critical_issues.length ===
        0
          ? "✅ HEALTHY"
          : "🚨 ISSUES FOUND"
      }`
    );
    console.log("📊".repeat(40));

    // Store comprehensive verification results
    this.debugLogger.addLog(
      "comprehensive-verification",
      "Single-Button Analysis Complete Verification",
      verification
    );

    return verification;
  }

  // ANSWER TO QUESTION 1: Can we see the LLM conversations?
  verifyLLMVisibility() {
    console.log("\n👁️ QUESTION 1: LLM Conversation Visibility");

    if (!this.debugLogger.isEnabled()) {
      console.log("❌ Debug mode is disabled - LLM conversations not visible");
      return { visible: false, reason: "debug_disabled" };
    }

    const conversations = this.debugLogger.getLLMConversations();
    console.log(
      `✅ LLM conversations are visible: ${conversations.length} total`
    );

    // Analyze conversation types
    const conversationTypes = {};
    conversations.forEach((conv) => {
      conversationTypes[conv.type] = (conversationTypes[conv.type] || 0) + 1;
    });

    console.log("   📋 Conversation breakdown:");
    Object.entries(conversationTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    return {
      visible: true,
      count: conversations.length,
      types: conversationTypes,
      has_individual_analysis: conversationTypes["single_button_analysis"] > 0,
    };
  }

  // ANSWER TO QUESTION 2: Is it really focusing on single buttons?
  verifySingleButtonProcessing(analysisResults) {
    console.log("\n🎯 QUESTION 2: Single-Button Focus Verification");

    const verification = {
      mode_confirmed: false,
      individual_processing_confirmed: false,
      expected_conversation_pattern: false,
      individual_results_found: false,
      issues: [],
    };

    // Check analysis method
    if (
      analysisResults.analysis_method ===
      "single_button_visual_feedback_CONFIRMED"
    ) {
      verification.mode_confirmed = true;
      console.log("✅ Analysis method confirms single-button processing");
    } else {
      verification.issues.push(
        "Analysis method not confirmed as single-button"
      );
      console.log(
        "❌ Analysis method does not confirm single-button processing"
      );
    }

    // Check processing confirmation
    if (
      analysisResults.processing_confirmation?.refinement_cycles ===
      "ONE_BUTTON_AT_A_TIME"
    ) {
      verification.individual_processing_confirmed = true;
      console.log(
        "✅ Processing confirmation indicates individual button processing"
      );
    } else {
      verification.issues.push(
        "Individual processing not confirmed in results"
      );
      console.log("❌ Individual processing not confirmed");
    }

    // Check LLM conversation pattern
    if (this.debugLogger.isEnabled()) {
      const conversations = this.debugLogger.getLLMConversations();
      const initialDetection = conversations.filter(
        (c) => c.type === "initial_detection_all_buttons"
      ).length;
      const singleButtonAnalysis = conversations.filter(
        (c) => c.type === "single_button_analysis"
      ).length;

      if (initialDetection === 1 && singleButtonAnalysis > 0) {
        verification.expected_conversation_pattern = true;
        console.log(
          `✅ Expected conversation pattern: 1 initial + ${singleButtonAnalysis} individual`
        );
      } else {
        verification.issues.push("Unexpected conversation pattern");
        console.log(
          `❌ Unexpected pattern: ${initialDetection} initial + ${singleButtonAnalysis} individual`
        );
      }
    }

    // Check for individual results in cycles
    if (analysisResults.feedback_cycles) {
      const cyclesWithIndividual = analysisResults.feedback_cycles.filter(
        (cycle) =>
          cycle.individual_results && cycle.individual_results.length > 0
      ).length;

      if (cyclesWithIndividual > 0) {
        verification.individual_results_found = true;
        console.log(
          `✅ Found individual results in ${cyclesWithIndividual} cycles`
        );
      } else {
        verification.issues.push("No individual results found in cycles");
        console.log("❌ No individual results found");
      }
    }

    console.log(
      `🎯 Single-Button Verification: ${
        verification.mode_confirmed &&
        verification.individual_processing_confirmed
          ? "CONFIRMED ✅"
          : "NOT CONFIRMED ❌"
      }`
    );

    return verification;
  }

  // ANSWER TO QUESTION 3: Is nudging happening?
  verifyNudgingBehavior(analysisResults) {
    console.log("\n📝 QUESTION 3: Smart Nudging Verification");

    const nudging = {
      nudging_events: 0,
      corrections_applied: 0,
      nudge_types: {},
      systematic_nudges: 0,
      buttons_with_corrections: [],
    };

    // Check debug logs for nudging events
    if (this.debugLogger.isEnabled()) {
      const nudgingEvents = this.debugLogger.getNudgingEvents();
      nudging.nudging_events = nudgingEvents.length;

      nudgingEvents.forEach((event) => {
        const nudgeType = event.nudgeData.type;
        nudging.nudge_types[nudgeType] =
          (nudging.nudge_types[nudgeType] || 0) + 1;

        if (event.nudgeData.systematic_analysis) {
          nudging.systematic_nudges++;
        }
      });

      console.log(`📝 Nudging events found: ${nudging.nudging_events}`);
      if (nudging.nudging_events > 0) {
        console.log("   📊 Nudge types:", nudging.nudge_types);
        console.log(`   🎯 Systematic nudges: ${nudging.systematic_nudges}`);
      }
    }

    // Check final buttons for correction metadata
    if (analysisResults.detected_buttons) {
      const buttonsWithCorrections = analysisResults.detected_buttons.filter(
        (button) => button.correction_applied
      );

      nudging.corrections_applied = buttonsWithCorrections.length;
      nudging.buttons_with_corrections = buttonsWithCorrections.map(
        (button) => ({
          name: button.reference_name,
          nudge_type: button.correction_applied.nudge_type,
        })
      );

      console.log(
        `📝 Buttons with corrections: ${nudging.corrections_applied}`
      );
    }

    const nudgingWorking =
      nudging.nudging_events > 0 || nudging.corrections_applied > 0;
    console.log(
      `📝 Smart Nudging Status: ${
        nudgingWorking ? "ACTIVE ✅" : "NOT NEEDED ℹ️"
      }`
    );

    return nudging;
  }

  // ANSWER TO QUESTION 4: Are prompts effective?
  analyzePromptEffectiveness() {
    console.log("\n📋 QUESTION 4: Prompt Effectiveness Analysis");

    const promptAnalysis = {
      total_conversations: 0,
      successful_parses: 0,
      failed_parses: 0,
      success_rate: 0,
      response_types: {},
      issues: [],
    };

    if (this.debugLogger.isEnabled()) {
      const conversations = this.debugLogger.getLLMConversations();
      promptAnalysis.total_conversations = conversations.length;

      conversations.forEach((conv) => {
        if (conv.response.parsing_successful) {
          promptAnalysis.successful_parses++;
        } else {
          promptAnalysis.failed_parses++;
        }

        const responseType = conv.response.response_type || "unknown";
        promptAnalysis.response_types[responseType] =
          (promptAnalysis.response_types[responseType] || 0) + 1;
      });

      promptAnalysis.success_rate =
        promptAnalysis.total_conversations > 0
          ? promptAnalysis.successful_parses /
            promptAnalysis.total_conversations
          : 0;

      console.log(
        `📋 Prompt success rate: ${Math.round(
          promptAnalysis.success_rate * 100
        )}%`
      );
      console.log(`   ✅ Successful: ${promptAnalysis.successful_parses}`);
      console.log(`   ❌ Failed: ${promptAnalysis.failed_parses}`);
      console.log("   📊 Response types:", promptAnalysis.response_types);

      // Generate recommendations
      if (promptAnalysis.success_rate < 0.7) {
        promptAnalysis.issues.push(
          "Low success rate - prompts may need improvement"
        );
      }
      if (promptAnalysis.response_types["generic_advice"] > 0) {
        promptAnalysis.issues.push(
          "Getting generic responses - prompts may be unclear"
        );
      }
    }

    const promptsEffective = promptAnalysis.success_rate > 0.7;
    console.log(
      `📋 Prompt Effectiveness: ${
        promptsEffective ? "EXCELLENT ✅" : "NEEDS WORK ⚠️"
      }`
    );

    return promptAnalysis;
  }

  // ANSWER TO QUESTION 5: Implementation health check
  performImplementationHealthCheck(analysisResults) {
    console.log("\n🏥 QUESTION 5: Implementation Health Check");

    const health = {
      critical_issues: [],
      warnings: [],
      performance_issues: [],
      data_consistency_issues: [],
    };

    // Check for critical issues
    if (!analysisResults.detected_buttons) {
      health.critical_issues.push("Missing detected_buttons array");
    }

    if (!analysisResults.total_api_calls) {
      health.critical_issues.push("Missing API call count");
    }

    // Check data consistency
    if (analysisResults.feedback_cycles) {
      analysisResults.feedback_cycles.forEach((cycle) => {
        if (cycle.individual_results) {
          const expectedButtons = cycle.buttons?.length || 0;
          const actualResults = cycle.individual_results.length;

          if (expectedButtons !== actualResults && expectedButtons > 0) {
            health.data_consistency_issues.push(
              `Cycle ${cycle.cycle}: Expected ${expectedButtons} results, got ${actualResults}`
            );
          }
        }
      });
    }

    // Check performance
    if (analysisResults.total_api_calls > 15) {
      health.performance_issues.push(
        `High API usage: ${analysisResults.total_api_calls} calls`
      );
    }

    // Check button data integrity
    if (analysisResults.detected_buttons) {
      analysisResults.detected_buttons.forEach((button, index) => {
        if (!button.reference_name) {
          health.critical_issues.push(
            `Button ${index}: Missing reference_name`
          );
        }
        if (!button.center_coordinates) {
          health.critical_issues.push(`Button ${index}: Missing coordinates`);
        }
      });
    }

    const isHealthy = health.critical_issues.length === 0;
    console.log(
      `🏥 Implementation Health: ${
        isHealthy ? "HEALTHY ✅" : "ISSUES FOUND 🚨"
      }`
    );

    if (health.critical_issues.length > 0) {
      console.log("   🚨 Critical issues:", health.critical_issues);
    }
    if (health.warnings.length > 0) {
      console.log("   ⚠️ Warnings:", health.warnings);
    }

    return health;
  }

  logSingleButtonCompletion(analysisResults) {
    const endTime = new Date();
    const duration = endTime - this.currentAnalysis.startTime;

    console.log("\n🎉 SINGLE-BUTTON ANALYSIS COMPLETED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`⏱️ Duration: ${Math.round(duration / 1000)}s`);
    console.log(`🎯 Mode: Single-Button Visual Feedback`);
    console.log(`📞 API Calls: ${analysisResults.total_api_calls || 1}`);
    console.log(
      `🎯 Buttons Found: ${analysisResults.detected_buttons?.length || 0}`
    );
    console.log(
      `📝 Nudging Applied: ${
        analysisResults.processing_confirmation?.nudging_applied ? "Yes" : "No"
      }`
    );

    if (this.debugLogger.isEnabled()) {
      const summary = this.debugLogger.getAnalysisSummary();
      console.log(`💬 LLM Conversations: ${summary.llmConversations}`);
      console.log(`📝 Nudging Events: ${summary.nudgingEvents}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  handleDebugModeChange(enabled) {
    if (enabled) {
      this.debugLogger.enable();
      console.log("🔍 Single-button debug logging enabled");
      console.log("   ✅ LLM conversation tracking: ACTIVE");
      console.log("   ✅ Nudging event monitoring: ACTIVE");
      console.log("   ✅ Single-button verification: ACTIVE");
    } else {
      this.debugLogger.disable();
      console.log("🔍 Debug logging disabled");
    }
  }

  showFeedbackCycle(cycleIndex) {
    if (
      !this.uiController.analysisResults ||
      !this.uiController.analysisResults.feedback_cycles
    ) {
      console.warn("No feedback cycles available");
      return;
    }

    const cycles = this.uiController.analysisResults.feedback_cycles;
    if (cycleIndex < 0 || cycleIndex >= cycles.length) {
      console.warn("Invalid cycle index:", cycleIndex);
      return;
    }

    const cycle = cycles[cycleIndex];
    const cycleViewer = document.getElementById("cycleViewer");

    if (!cycleViewer) {
      console.warn("Cycle viewer element not found");
      return;
    }

    // Update active button
    document.querySelectorAll(".cycle-btn").forEach((btn, index) => {
      btn.classList.toggle("active", index === cycleIndex);
    });

    // Create detailed cycle display focused on single-button analysis
    let cycleInfo = `🎯 Cycle ${cycle.cycle}: ${
      cycle.type === "initial_detection"
        ? "Initial Detection (ALL buttons analyzed together)"
        : "Individual Refinement (EACH button analyzed separately)"
    } - ${cycle.buttons.length} buttons`;

    // Add processing confirmation
    if (cycle.processing_mode === "SINGLE_BUTTON_INDIVIDUAL_CONFIRMED") {
      cycleInfo += ` <span style="color: #059669; font-weight: bold;">🎯 CONFIRMED: Individual Processing</span>`;
    }

    if (cycle.parsing_successful === false) {
      cycleInfo += ` <span style="color: #dc2626;">(⚠️ Parsing Issues)</span>`;
    } else if (cycle.parsing_successful === true) {
      cycleInfo += ` <span style="color: #059669;">(✅ Successfully Parsed)</span>`;
    }

    // Show individual processing details
    if (cycle.individual_results) {
      const successful = cycle.individual_results.filter(
        (r) => r.result.parsing_successful
      ).length;
      cycleInfo += ` - Individual Processing: ${successful}/${cycle.individual_results.length} successful`;
    }

    if (cycle.corrections && cycle.corrections.length > 0) {
      cycleInfo += ` (📝 ${cycle.corrections.length} smart corrections applied)`;
    }

    // Enhanced individual button results display
    let individualResultsHtml = "";
    if (cycle.individual_results && cycle.individual_results.length > 0) {
      individualResultsHtml = `
        <div class="analysis-details">
          <h5>🎯 Individual Button Processing Results:</h5>
          <div class="individual-button-grid">
            ${cycle.individual_results
              .map((individual) => {
                const result = individual.result;
                const statusIcon = result.parsing_successful ? "✅" : "❌";
                const statusClass = result.parsing_successful
                  ? "success"
                  : "failed";

                return `
                  <div class="individual-button-item ${statusClass}">
                    <div class="button-header">
                      <strong>${statusIcon} ${individual.buttonName}</strong>
                      <span class="button-status">${
                        result.response_type || "unknown"
                      }</span>
                    </div>
                    ${
                      result.parsing_successful
                        ? `
                        <div class="button-metrics">
                          <span>Confidence: ${
                            result.confidence || "N/A"
                          }%</span>
                          <span>Accuracy: ${
                            result.overallAccuracy || "N/A"
                          }%</span>
                        </div>
                        ${
                          result.buttonAnalyses
                            ? `
                          <div class="systematic-analysis">
                            <span><strong>🔍 Systematic Analysis:</strong></span>
                            ${result.buttonAnalyses
                              .map((analysis) =>
                                analysis.systematic_analysis
                                  ? `
                                <span>Overlap: ${
                                  analysis.box_overlaps_button ? "Yes" : "No"
                                } (${analysis.overlap_percentage || 0}%)</span>
                                <span>Direction: ${
                                  analysis.compass_direction || "N/A"
                                }</span>
                                <span>Quadrants: ${
                                  analysis.quadrants_with_button
                                    ? analysis.quadrants_with_button.join(", ")
                                    : "None"
                                }</span>
                                <span>Dot on button: ${
                                  analysis.white_dot_on_button ? "Yes" : "No"
                                }</span>
                              `
                                  : "<span>Legacy analysis format</span>"
                              )
                              .join("")}
                          </div>
                        `
                            : ""
                        }
                    `
                        : `
                        <div class="button-error">
                          <span>❌ Analysis failed: ${
                            result.error || result.response_type
                          }</span>
                        </div>
                    `
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    // Smart corrections display
    let correctionsHtml = "";
    if (cycle.corrections && cycle.corrections.length > 0) {
      correctionsHtml = `
        <div class="corrections-info">
          <h5>📝 Smart Nudging Applied:</h5>
          <div class="corrections-grid">
            ${cycle.corrections
              .map(
                (corr) => `
                <div class="correction-item systematic">
                  <strong>🎯 Button ${corr.button_number}:</strong> ${
                  corr.issue
                }
                  ${
                    corr.nudging_applied
                      ? `
                      <div class="nudging-info">
                        <span>🎯 Nudge Type: ${corr.nudge_type}</span>
                        <span>Direction: ${corr.nudge_direction}</span>
                        <span>Multiplier: ${corr.nudge_multiplier}x</span>
                        <span>Movement: (${corr.nudge_vector?.x || 0}, ${
                          corr.nudge_vector?.y || 0
                        })</span>
                        <span>New Position: (${corr.new_bbox_x}, ${
                          corr.new_bbox_y
                        })</span>
                      </div>
                  `
                      : `
                      <div class="direct-coords">
                        <span>📍 Direct coordinates used: (${corr.new_bbox_x}, ${corr.new_bbox_y})</span>
                      </div>
                  `
                  }
                  ${
                    corr.systematic_analysis
                      ? `
                      <div class="systematic-correction-info">
                        <div class="correction-detail">
                          <span class="correction-detail-label">🔍 Analysis Base:</span>
                          <span class="correction-detail-value">
                            ${
                              corr.systematic_analysis.box_overlaps_button
                                ? "Overlap detected"
                                : "No overlap"
                            } 
                            (${
                              corr.systematic_analysis.overlap_percentage || 0
                            }%)
                          </span>
                        </div>
                        <div class="correction-detail">
                          <span class="correction-detail-label">🧭 Direction:</span>
                          <span class="correction-detail-value">${
                            corr.systematic_analysis.compass_direction || "N/A"
                          }</span>
                        </div>
                      </div>
                  `
                      : ""
                  }
                </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    cycleViewer.innerHTML = `
      <img src="${cycle.overlayImageUrl}" alt="Cycle ${cycle.cycle}" class="cycle-image" />
      <p class="cycle-info">${cycleInfo}</p>
      ${individualResultsHtml}
      ${correctionsHtml}
    `;
  }

  showDebugTab(tabName) {
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
      this.updateFeedbackViewer();
    }

    this.currentDebugTab = tabName;
  }

  updateFeedbackViewer() {
    const feedbackViewer = document.getElementById("feedbackViewer");
    if (!feedbackViewer || !this.debugLogger.isEnabled()) return;

    if (
      !this.uiController.analysisResults ||
      !this.uiController.analysisResults.feedback_cycles
    ) {
      feedbackViewer.innerHTML =
        "<p>No feedback cycles available. Run analysis to see detailed cycle information.</p>";
      return;
    }

    const cycles = this.uiController.analysisResults.feedback_cycles;
    const feedbackHtml = cycles
      .map((cycle, index) => {
        const processingMode =
          cycle.processing_mode === "SINGLE_BUTTON_INDIVIDUAL_CONFIRMED"
            ? "🎯 Individual"
            : "📊 Group";
        const successRate = cycle.individual_results
          ? `${
              cycle.individual_results.filter(
                (r) => r.result.parsing_successful
              ).length
            }/${cycle.individual_results.length}`
          : "N/A";

        return `
        <div class="feedback-cycle-summary">
          <div class="cycle-header">
            <h4>🔄 Cycle ${cycle.cycle} - ${processingMode}</h4>
            <span class="cycle-stats">Success: ${successRate}</span>
          </div>
          <div class="cycle-details">
            <div>📊 Buttons: ${cycle.buttons.length}</div>
            <div>📝 Corrections: ${cycle.corrections?.length || 0}</div>
            <div>📞 Type: ${
              cycle.type === "initial_detection"
                ? "Initial Detection"
                : "Individual Refinement"
            }</div>
            <div>✅ Parsing: ${
              cycle.parsing_successful ? "Success" : "Failed"
            }</div>
          </div>
        </div>
      `;
      })
      .join("");

    feedbackViewer.innerHTML =
      feedbackHtml || "<p>No feedback cycles to display</p>";
  }

  // Export comprehensive single-button report
  exportSingleButtonReport() {
    if (!this.uiController.analysisResults) {
      alert("No analysis results available to export");
      return;
    }

    const report = {
      timestamp: new Date().toISOString(),
      analysis_type: "single_button_visual_feedback",
      results: this.uiController.analysisResults,
      verification: this.performComprehensiveVerification(
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
    };

    const jsonData = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `single_button_analysis_report_${new Date().getTime()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    console.log("📄 Single-button analysis report exported successfully");
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
      mode: "single_button_visual_feedback_only",
      current_analysis: this.currentAnalysis,
      available_features: [
        "Individual button processing",
        "Systematic overlap analysis",
        "Smart nudging",
        "LLM conversation tracking",
        "Comprehensive verification",
      ],
      removed_features: [
        "Standard analysis (moved to separate project)",
        "Progressive slicing (moved to separate project)",
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
    app.exportSingleButtonReport();
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
🎯 SINGLE-BUTTON ANALYSIS APP LOADED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available console commands:
• getAnalysisStatus() - Get current app status
• exportAnalysisReport() - Export comprehensive report
• debugLogger.getAnalysisSummary() - Get debug summary
• app.getDebugLogger().getLLMConversations() - View LLM conversations
• app.getDebugLogger().getNudgingEvents() - View nudging events

🎯 This app now focuses exclusively on single-button analysis!
`);
