// FeedbackAnalyzer.js - Main orchestrator for single-button focused visual feedback
class FeedbackAnalyzer {
  constructor(detector, imageProcessor) {
    this.detector = detector;
    this.imageProcessor = imageProcessor;
    this.currentMode = "single_button_focused";

    // Initialize specialized components
    this.alignmentAnalyzer = new AlignmentAnalyzer(detector);
    this.systematicAnalyzer = new SystematicAnalyzer(detector);
    this.nudgingEngine = new NudgingEngine();
    this.overlayGenerator = new OverlayGenerator();

    console.log("🎯 FeedbackAnalyzer initialized with specialized components");
  }

  // Main visual feedback analysis with enhanced single-button verification
  async analyzeWithVisualFeedback(originalFile, imageDimensions) {
    console.log("🎯 Starting SINGLE-BUTTON focused visual feedback analysis");
    this.detector.apiCallCount = 1; // Count initial analysis

    // Initialize debug logging with session tracking
    this.initializeDebugSession();

    try {
      // Step 1: Initial detection (this analyzes ALL buttons at once)
      const initialAnalysis = await this.performInitialDetection(originalFile);

      if (
        !initialAnalysis.detected_buttons ||
        initialAnalysis.detected_buttons.length === 0
      ) {
        console.log("❌ No buttons found in initial detection");
        return initialAnalysis;
      }

      console.log(
        `✅ Initial detection found ${initialAnalysis.detected_buttons.length} buttons`
      );
      console.log("🔄 Now switching to SINGLE-BUTTON analysis mode...");

      // Convert to bounding box format for feedback cycles
      let currentButtons = this.convertToBoundingBoxFormat(
        initialAnalysis.detected_buttons
      );

      this.logModeSwitch(currentButtons);

      // Step 2: Run feedback cycles with CONFIRMED single-button focus
      const feedbackCycles = await this.runFeedbackCycles(
        originalFile,
        currentButtons,
        imageDimensions
      );

      // Finalize and return results
      return this.finalizeAnalysisResults(currentButtons, feedbackCycles);
    } catch (error) {
      this.logAnalysisError(error);
      throw error;
    } finally {
      this.cleanupAnalysis();
    }
  }

  // Initialize debug session
  initializeDebugSession() {
    if (typeof debugLogger !== "undefined") {
      debugLogger.clear();
      debugLogger.startAnalysisSession();
      debugLogger.currentAnalysisSession.mode = "single_button_visual_feedback";

      debugLogger.addLog(
        "info",
        "🎯 SINGLE-BUTTON Visual Feedback Analysis Started",
        {
          maxCycles: 3,
          approach: "single_button_focus_CONFIRMED",
          mode: this.currentMode,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  // Perform initial detection of ALL buttons
  async performInitialDetection(originalFile) {
    console.log("📸 Step 1: Initial detection of ALL buttons...");
    const initialAnalysis = await this.detector.analyzeImageForButtons(
      originalFile
    );

    if (typeof debugLogger !== "undefined") {
      debugLogger.addLLMConversation(
        "initial_detection_all_buttons",
        {
          name: "ALL_BUTTONS",
          count: initialAnalysis.detected_buttons?.length || 0,
        },
        {
          prompt: "Initial detection prompt (see prompt.txt)",
          imageUrl: "original_image",
          model: "gpt-4o",
          attempt: 1,
        },
        {
          raw: JSON.stringify(initialAnalysis, null, 2),
          parsed: initialAnalysis,
          parsing_successful: initialAnalysis.detected_buttons?.length > 0,
          response_type: "initial_detection",
        },
        {
          stage: "initial_detection",
          buttonsFound: initialAnalysis.detected_buttons?.length || 0,
        }
      );

      debugLogger.addLog(
        "api-call",
        "✅ Initial Detection - ALL BUTTONS AT ONCE",
        {
          callNumber: 1,
          buttonsFound: initialAnalysis.detected_buttons?.length || 0,
          response: initialAnalysis,
          mode: "ANALYZE_ALL_BUTTONS_TOGETHER",
        }
      );
    }

    return initialAnalysis;
  }

  // Convert detected buttons to bounding box format
  convertToBoundingBoxFormat(detectedButtons) {
    return detectedButtons.map((button) => ({
      reference_name: button.reference_name,
      description: button.description,
      element_type: button.element_type,
      confidence: button.confidence,
      bounding_box: {
        x: Math.max(
          0,
          button.center_coordinates.x - button.estimated_size.width / 2
        ),
        y: Math.max(
          0,
          button.center_coordinates.y - button.estimated_size.height / 2
        ),
        width: button.estimated_size.width,
        height: button.estimated_size.height,
      },
    }));
  }

  // Log mode switch to single-button analysis
  logModeSwitch(currentButtons) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog("mode-switch", `🔄 SWITCHING TO SINGLE-BUTTON MODE`, {
        fromMode: "initial_all_buttons_detection",
        toMode: "single_button_individual_analysis",
        buttonsToAnalyze: currentButtons.length,
        buttonNames: currentButtons.map((b) => b.reference_name),
      });
    }
  }

  // Run feedback cycles with single-button processing
  async runFeedbackCycles(originalFile, currentButtons, imageDimensions) {
    const feedbackCycles = [];
    let cycleNumber = 1;
    const maxCycles = 3;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 2;

    while (cycleNumber <= maxCycles) {
      console.log(
        `🔄 CYCLE ${cycleNumber}/${maxCycles}: Analyzing ${currentButtons.length} buttons ONE BY ONE`
      );

      this.logCycleStart(cycleNumber, currentButtons);

      // Process each button individually in this cycle
      const cycleResults = await this.processSingleButtonCycle(
        originalFile,
        currentButtons,
        cycleNumber,
        imageDimensions
      );

      // Create cycle data
      const cycleData = this.createCycleData(
        cycleNumber,
        currentButtons,
        cycleResults
      );
      feedbackCycles.push(cycleData);

      this.logCycleComplete(cycleNumber, cycleResults);

      // Check for consecutive failures
      if (
        this.shouldStopDueToFailures(
          cycleResults,
          consecutiveFailures,
          maxConsecutiveFailures,
          cycleData
        )
      ) {
        consecutiveFailures++;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(
            "🛑 Too many consecutive cycle failures, stopping analysis"
          );
          cycleData.termination_reason = "consecutive_cycle_failures";
          break;
        }
      } else {
        consecutiveFailures = 0;
      }

      // Apply corrections if any (smart nudging)
      const shouldContinue = await this.handleCycleCorrections(
        cycleResults,
        currentButtons,
        cycleData
      );

      if (!shouldContinue) break;

      cycleNumber++;
    }

    return feedbackCycles;
  }

  // Process each button individually in a cycle
  async processSingleButtonCycle(
    originalFile,
    currentButtons,
    cycleNumber,
    imageDimensions
  ) {
    console.log(
      `🔍 Processing ${currentButtons.length} buttons INDIVIDUALLY in cycle ${cycleNumber}`
    );

    const individualResults = [];
    const allCorrections = [];
    const buttonAnalyses = [];
    let totalConfidence = 0;
    let totalAccuracy = 0;
    let successfulParses = 0;
    let nudgingCount = 0;

    // Create combined overlay for display purposes (using imageProcessor as fallback)
    let combinedOverlayUrl;
    try {
      combinedOverlayUrl = await this.overlayGenerator.createCombinedOverlay(
        originalFile,
        currentButtons,
        cycleNumber
      );
    } catch (error) {
      console.log("📋 Using imageProcessor fallback for combined overlay");
      combinedOverlayUrl = await this.imageProcessor.createBoundingBoxOverlay(
        originalFile,
        currentButtons,
        cycleNumber
      );
    }

    // Process each button ONE BY ONE
    for (
      let buttonIndex = 0;
      buttonIndex < currentButtons.length;
      buttonIndex++
    ) {
      const button = currentButtons[buttonIndex];
      console.log(
        `🎯 INDIVIDUAL ANALYSIS ${buttonIndex + 1}/${currentButtons.length}: ${
          button.reference_name
        }`
      );

      this.logSingleButtonStart(buttonIndex, button, cycleNumber);

      try {
        // Create single-button overlay
        const singleButtonOverlay =
          await this.overlayGenerator.createSingleButtonOverlay(
            originalFile,
            button,
            buttonIndex + 1,
            cycleNumber
          );

        // Analyze this single button (using direct alignment check)
        this.detector.apiCallCount++;
        const result = await this.analyzeSingleButton(
          singleButtonOverlay,
          button,
          buttonIndex + 1,
          cycleNumber
        );

        // Process results
        const processedResult = this.processSingleButtonResult(
          result,
          button,
          buttonIndex
        );

        // Update counters from processed result
        if (result.parsing_successful) {
          successfulParses++;
          totalConfidence += result.confidence || 50;
          totalAccuracy += result.overallAccuracy || 50;

          if (result.buttonAnalyses) {
            buttonAnalyses.push(...result.buttonAnalyses);
          }

          if (result.corrections && result.corrections.length > 0) {
            const smartCorrections = this.nudgingEngine.applySmartNudging(
              result.corrections,
              button,
              buttonIndex
            );
            allCorrections.push(...smartCorrections);
            nudgingCount += smartCorrections.length;
          }
        }

        this.logSingleButtonComplete(buttonIndex, button, result);
      } catch (error) {
        console.error(
          `❌ Error analyzing button ${buttonIndex + 1} INDIVIDUALLY:`,
          error
        );
        individualResults.push({
          buttonIndex: buttonIndex + 1,
          buttonName: button.reference_name,
          result: {
            parsing_successful: false,
            error: error.message,
            response_type: "error",
          },
          analysisMode: "SINGLE_BUTTON_INDIVIDUAL_FAILED",
        });
      }
    }

    // Calculate cycle statistics
    const successRate =
      currentButtons.length > 0 ? successfulParses / currentButtons.length : 0;
    const averageConfidence =
      successfulParses > 0 ? totalConfidence / successfulParses : 25;
    const averageAccuracy =
      successfulParses > 0 ? totalAccuracy / successfulParses : 25;

    console.log(
      `📊 CYCLE ${cycleNumber} SUMMARY: ${successfulParses}/${currentButtons.length} successful, ${nudgingCount} nudging events`
    );

    return {
      individualResults,
      allCorrections,
      buttonAnalyses,
      averageConfidence,
      averageAccuracy,
      allSuccessful: successfulParses === currentButtons.length,
      successRate,
      buttonsProcessed: currentButtons.length,
      combinedOverlayUrl,
      nudgingCount,
      processingMode: "SINGLE_BUTTON_INDIVIDUAL_CONFIRMED",
    };
  }

  // Analyze a single button (primary method uses direct alignment, fallback to systematic)
  async analyzeSingleButton(
    overlayImageUrl,
    button,
    buttonNumber,
    cycleNumber
  ) {
    console.log(`🤖 Analyzing single button: ${button.reference_name}`);

    try {
      // Primary method: Direct alignment check (based on successful manual test)
      const alignmentResult =
        await this.alignmentAnalyzer.analyzeSingleButtonAlignment(
          overlayImageUrl,
          button,
          buttonNumber,
          cycleNumber
        );

      if (alignmentResult.parsing_successful) {
        console.log(
          `✅ Direct alignment check successful for button ${buttonNumber}`
        );
        return alignmentResult;
      }

      console.log(
        `⚠️ Direct alignment check failed, trying systematic analysis for button ${buttonNumber}`
      );

      // Fallback method: Systematic analysis
      const systematicResult = await this.systematicAnalyzer.analyzeSystematic(
        overlayImageUrl,
        button,
        buttonNumber,
        cycleNumber
      );

      if (systematicResult.parsing_successful) {
        console.log(
          `✅ Systematic analysis successful for button ${buttonNumber}`
        );
        return systematicResult;
      }

      console.log(`⚠️ Both methods failed for button ${buttonNumber}`);
      return alignmentResult; // Return the first attempt's result
    } catch (error) {
      console.error(
        `❌ Error in single button analysis for button ${buttonNumber}:`,
        error
      );
      return {
        corrections: [],
        confidence: 25,
        overallAccuracy: 25,
        parsing_successful: false,
        response_type: "analysis_error",
        raw_response: error.message,
        buttonAnalyses: [],
      };
    }
  }

  // Create cycle data structure
  createCycleData(cycleNumber, currentButtons, cycleResults) {
    return {
      cycle: cycleNumber,
      type:
        cycleNumber === 1 ? "initial_detection" : "single_button_refinement",
      buttons: [...currentButtons],
      button_analyses: cycleResults.buttonAnalyses,
      corrections: cycleResults.allCorrections,
      confidence: cycleResults.averageConfidence,
      overallAccuracy: cycleResults.averageAccuracy,
      parsing_successful: cycleResults.allSuccessful,
      buttons_processed: cycleResults.buttonsProcessed,
      individual_results: cycleResults.individualResults,
      overlayImageUrl: cycleResults.combinedOverlayUrl,
      processing_mode: "SINGLE_BUTTON_INDIVIDUAL",
    };
  }

  // Handle cycle corrections and nudging
  async handleCycleCorrections(cycleResults, currentButtons, cycleData) {
    if (cycleResults.allCorrections.length > 0) {
      console.log(
        `📝 Applying ${cycleResults.allCorrections.length} corrections with SMART NUDGING`
      );

      this.logNudgingStart(cycleResults.allCorrections);

      // Apply corrections using the nudging engine
      const correctedButtons = this.nudgingEngine.applyBoundingBoxCorrections(
        currentButtons,
        cycleResults.allCorrections
      );

      // Update the current buttons array
      currentButtons.splice(0, currentButtons.length, ...correctedButtons);

      cycleData.corrections_applied = cycleResults.allCorrections.length;
      cycleData.nudging_applied = true;

      return true; // Continue processing
    } else {
      cycleData.nudging_applied = false;

      // Check if we should stop early due to high accuracy
      if (cycleResults.averageAccuracy >= 90 && cycleResults.allSuccessful) {
        console.log(
          "✅ High accuracy achieved with successful parsing - stopping early"
        );
        cycleData.termination_reason = "high_accuracy_achieved";
        return false; // Stop processing
      } else {
        console.log(
          `📊 No corrections but accuracy only ${cycleResults.averageAccuracy}% - continuing`
        );
        return true; // Continue processing
      }
    }
  }

  // Check if we should stop due to consecutive failures
  shouldStopDueToFailures(
    cycleResults,
    consecutiveFailures,
    maxConsecutiveFailures,
    cycleData
  ) {
    if (!cycleResults.allSuccessful && cycleResults.successRate < 0.5) {
      console.log(
        `⚠️ Cycle mostly failed (${
          cycleResults.successRate * 100
        }% success rate) - ${
          consecutiveFailures + 1
        }/${maxConsecutiveFailures} consecutive failures`
      );
      return true;
    }
    return false;
  }

  // Finalize analysis results
  finalizeAnalysisResults(currentButtons, feedbackCycles) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.endAnalysisSession();
      debugLogger.addLog(
        "success",
        "✅ SINGLE-BUTTON Visual Feedback Analysis Completed",
        {
          totalCycles: feedbackCycles.length,
          totalApiCalls: this.detector.apiCallCount,
          finalButtonCount: currentButtons.length,
          approach: "single_button_focus_CONFIRMED",
          sessionSummary: debugLogger.getAnalysisSummary(),
        }
      );
    }

    // Convert back to center coordinates format for consistency
    const finalButtons = currentButtons.map((button) => ({
      reference_name: button.reference_name,
      description: button.description,
      element_type: button.element_type,
      confidence: button.confidence,
      center_coordinates: {
        x: Math.round(button.bounding_box.x + button.bounding_box.width / 2),
        y: Math.round(button.bounding_box.y + button.bounding_box.height / 2),
      },
      estimated_size: {
        width: button.bounding_box.width,
        height: button.bounding_box.height,
      },
      refinement_cycles: feedbackCycles.length,
      processing_mode: "SINGLE_BUTTON_CONFIRMED",
    }));

    return {
      detected_buttons: finalButtons,
      analysis_summary: {
        total_elements_found: finalButtons.length,
        image_description: `SINGLE-BUTTON focused visual feedback analysis with ${feedbackCycles.length} refinement cycles`,
      },
      analysis_method: "single_button_visual_feedback_CONFIRMED",
      total_api_calls: this.detector.apiCallCount,
      feedback_cycles: feedbackCycles,
      processing_confirmation: {
        mode: "SINGLE_BUTTON_INDIVIDUAL_PROCESSING",
        initial_detection: "ALL_BUTTONS_AT_ONCE",
        refinement_cycles: "ONE_BUTTON_AT_A_TIME",
        nudging_applied: feedbackCycles.some((c) => c.nudging_applied),
      },
      debug_log:
        typeof debugLogger !== "undefined" ? debugLogger.getLogs() : undefined,
    };
  }

  // Cleanup analysis resources
  cleanupAnalysis() {
    // Clear overlay cache to free memory
    this.overlayGenerator.clearCache();

    // Clear nudging history
    this.nudgingEngine.clearHistory();
  }

  // Helper logging methods
  logCycleStart(cycleNumber, currentButtons) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog(
        "cycle-start",
        `🔄 Starting SINGLE-BUTTON Cycle ${cycleNumber}`,
        {
          cycleNumber,
          mode: "SINGLE_BUTTON_INDIVIDUAL_PROCESSING",
          buttonsInCycle: currentButtons.length,
          buttonNames: currentButtons.map((b) => b.reference_name),
        }
      );
    }
  }

  logCycleComplete(cycleNumber, cycleResults) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog(
        "feedback",
        `✅ Cycle ${cycleNumber} SINGLE-BUTTON Analysis Complete`,
        {
          cycleNumber,
          mode: "SINGLE_BUTTON_CONFIRMED",
          buttonsProcessed: cycleResults.buttonsProcessed,
          totalCorrections: cycleResults.allCorrections.length,
          averageConfidence: cycleResults.averageConfidence,
          parsing_successful: cycleResults.allSuccessful,
          individual_success_rate: cycleResults.successRate,
          nudgingEventsInCycle: cycleResults.nudgingCount || 0,
        }
      );
    }
  }

  logSingleButtonStart(buttonIndex, button, cycleNumber) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog(
        "single-button-start",
        `🎯 Starting INDIVIDUAL analysis for button ${buttonIndex + 1}`,
        {
          buttonIndex: buttonIndex + 1,
          buttonName: button.reference_name,
          cycleNumber: cycleNumber,
          mode: "SINGLE_BUTTON_INDIVIDUAL_CONFIRMED",
        }
      );
    }
  }

  logSingleButtonComplete(buttonIndex, button, result) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog(
        "single-button-complete",
        `✅ Button ${buttonIndex + 1} (${
          button.reference_name
        }) INDIVIDUAL analysis complete`,
        {
          buttonIndex: buttonIndex + 1,
          buttonName: button.reference_name,
          parsing_successful: result.parsing_successful,
          corrections: result.corrections?.length || 0,
          confidence: result.confidence,
          response_type: result.response_type,
          nudgingApplied: result.corrections?.length > 0,
        }
      );
    }
  }

  logNudgingStart(corrections) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog(
        "nudging-start",
        `📝 Starting SMART NUDGING for ${corrections.length} corrections`,
        {
          correctionsToApply: corrections.length,
          correctionDetails: corrections.map((c) => ({
            button: c.button_number,
            type: c.nudge_type,
            direction: c.nudge_direction,
            hasSystematicAnalysis: !!c.systematic_analysis,
            hasAlignmentAnalysis: !!c.alignment_analysis,
          })),
        }
      );
    }
  }

  logAnalysisError(error) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog(
        "error",
        "❌ SINGLE-BUTTON Visual Feedback Analysis Failed",
        {
          error: error.message,
          apiCallsUsed: this.detector.apiCallCount,
        }
      );
    }
    console.error("Error in single-button visual feedback analysis:", error);
  }

  // Process single button result (helper method)
  processSingleButtonResult(result, button, buttonIndex) {
    // This method was used to process individual button results
    // but the processing logic is now directly in processSingleButtonCycle
    // This is kept for compatibility but doesn't need to do anything special
    return {
      processed: true,
      buttonIndex: buttonIndex + 1,
      buttonName: button.reference_name,
      parsing_successful: result.parsing_successful,
      confidence: result.confidence || 50,
      corrections: result.corrections?.length || 0,
    };
  }

  // Public methods for verification and statistics
  verifySingleButtonMode() {
    return {
      mode: this.currentMode,
      confirmed: this.currentMode === "single_button_focused",
      description:
        "This analyzer is configured for single-button individual analysis",
      components: {
        alignmentAnalyzer: !!this.alignmentAnalyzer,
        systematicAnalyzer: !!this.systematicAnalyzer,
        nudgingEngine: !!this.nudgingEngine,
        overlayGenerator: !!this.overlayGenerator,
      },
    };
  }

  getAnalysisStats() {
    const baseStats = {
      mode_verification: this.verifySingleButtonMode(),
      overlay_cache: this.overlayGenerator.getCacheStats(),
      nudging_stats: this.nudgingEngine.getNudgingStats(),
    };

    if (typeof debugLogger !== "undefined") {
      const summary = debugLogger.getAnalysisSummary();
      return {
        ...baseStats,
        ...summary,
        llm_conversations: debugLogger.getLLMConversations().length,
        nudging_events: debugLogger.getNudgingEvents().length,
      };
    }

    return baseStats;
  }
  // Method to get component references (for debugging)
  getComponents() {
    return {
      alignmentAnalyzer: this.alignmentAnalyzer,
      systematicAnalyzer: this.systematicAnalyzer,
      nudgingEngine: this.nudgingEngine,
      overlayGenerator: this.overlayGenerator,
    };
  }
}
