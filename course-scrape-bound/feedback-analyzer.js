// FeedbackAnalyzer.js - Simplified feedback analysis with max 3 attempts per button
class FeedbackAnalyzer {
  constructor(detector, imageProcessor) {
    this.detector = detector;
    this.imageProcessor = imageProcessor;
    this.currentMode = "simple_alignment";

    // Initialize components
    this.alignmentAnalyzer = new AlignmentAnalyzer(detector);
    this.nudgingEngine = new NudgingEngine();
    this.overlayGenerator = new OverlayGenerator();
    this.maxAlignmentAttempts = 3;

    console.log(
      "🎯 FeedbackAnalyzer initialized with simple alignment process"
    );
  }

  // Main analysis - simplified process with max 3 attempts per button
  async analyzeWithVisualFeedback(originalFile, imageDimensions) {
    console.log("🎯 Starting simplified button detection and alignment");
    this.detector.apiCallCount = 1; // Count initial analysis

    // Initialize debug logging
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

      // Convert to bounding box format
      let currentButtons = this.convertToBoundingBoxFormat(
        initialAnalysis.detected_buttons
      );

      // Step 2: Process each button individually (max 3 alignment checks each)
      console.log(
        "🔍 Processing each button individually with simple alignment..."
      );
      const processedButtons = await this.processAllButtons(
        originalFile,
        currentButtons
      );

      // Step 3: Return final results
      return this.finalizeSimpleResults(processedButtons);
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
      debugLogger.currentAnalysisSession.mode = "simple_alignment";

      debugLogger.addLog("info", "🎯 Simple Alignment Analysis Started", {
        maxAttemptsPerButton: this.maxAlignmentAttempts,
        approach: "simple_alignment_process",
        mode: this.currentMode,
        timestamp: new Date().toISOString(),
      });
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

  // Process all buttons - one by one, max 3 attempts each
  async processAllButtons(originalFile, buttons) {
    const processedButtons = [];

    for (let i = 0; i < buttons.length; i++) {
      console.log(
        `\n🎯 Processing button ${i + 1}/${buttons.length}: ${
          buttons[i].reference_name
        }`
      );

      const processedButton = await this.processButton(
        originalFile,
        buttons[i],
        i + 1
      );
      processedButtons.push(processedButton);
    }

    return processedButtons;
  }

  // Process single button - max 3 alignment attempts, then done
  async processButton(originalFile, button, buttonNumber) {
    let currentButton = { ...button };
    let alignmentAttempt = 1;
    let isAligned = false;

    // Track alignment history
    currentButton.alignmentHistory = [];
    currentButton.nudgeHistory = [];

    while (alignmentAttempt <= this.maxAlignmentAttempts && !isAligned) {
      console.log(
        `🔍 Alignment attempt ${alignmentAttempt}/${this.maxAlignmentAttempts} for button ${buttonNumber}`
      );

      // Create overlay with current bounding box
      const overlayUrl = await this.overlayGenerator.createSingleButtonOverlay(
        originalFile,
        currentButton,
        buttonNumber,
        alignmentAttempt
      );

      // Check alignment (single attempt, no retries)
      this.detector.apiCallCount++;
      const alignmentResult =
        await this.alignmentAnalyzer.analyzeSingleButtonAlignment(
          overlayUrl,
          currentButton,
          buttonNumber,
          alignmentAttempt
        );

      // Store alignment result
      currentButton.alignmentHistory.push({
        attempt: alignmentAttempt,
        result: alignmentResult,
        overlayUrl: overlayUrl,
      });

      if (alignmentResult.isAligned) {
        console.log(`✅ Button ${buttonNumber} is aligned!`);
        isAligned = true;
        currentButton.finalStatus = "aligned";
      } else if (
        alignmentResult.needsMovement &&
        alignmentAttempt < this.maxAlignmentAttempts
      ) {
        console.log(
          `📝 Button ${buttonNumber} needs to move ${alignmentResult.direction}`
        );

        // Apply corrections using nudging engine
        if (
          alignmentResult.corrections &&
          alignmentResult.corrections.length > 0
        ) {
          const nudgedCorrections = this.nudgingEngine.applySmartNudging(
            alignmentResult.corrections,
            currentButton,
            buttonNumber - 1
          );

          // Apply the correction to get new position
          if (nudgedCorrections.length > 0) {
            const correction = nudgedCorrections[0];
            const originalBbox = currentButton.bounding_box;

            currentButton.bounding_box = {
              x: correction.new_bbox_x,
              y: correction.new_bbox_y,
              width: correction.new_bbox_width || originalBbox.width,
              height: correction.new_bbox_height || originalBbox.height,
            };

            currentButton.nudgeHistory.push({
              attempt: alignmentAttempt,
              direction: alignmentResult.direction,
              from: originalBbox,
              to: currentButton.bounding_box,
              correction: correction,
            });
          }
        }
      } else {
        console.log(
          `⚠️ Button ${buttonNumber} alignment incomplete - stopping at attempt ${alignmentAttempt}`
        );
        currentButton.finalStatus = "alignment_incomplete";
        break;
      }

      alignmentAttempt++;
    }

    if (!isAligned && alignmentAttempt > this.maxAlignmentAttempts) {
      currentButton.finalStatus = "max_attempts_reached";
    }

    return currentButton;
  }

  // Finalize simple results
  finalizeSimpleResults(processedButtons) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.endAnalysisSession();
      debugLogger.addLog("success", "✅ Simple Alignment Analysis Completed", {
        totalButtons: processedButtons.length,
        totalApiCalls: this.detector.apiCallCount,
        approach: "simple_alignment_process",
      });
    }

    // Convert back to center coordinates format
    const finalButtons = processedButtons.map((button) => ({
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
      alignment_attempts: button.alignmentHistory?.length || 0,
      nudge_count: button.nudgeHistory?.length || 0,
      final_status: button.finalStatus || "unknown",
      alignment_history: button.alignmentHistory,
      nudge_history: button.nudgeHistory,
      processing_mode: "SIMPLE_ALIGNMENT",
    }));

    const alignedButtons = finalButtons.filter(
      (b) => b.final_status === "aligned"
    ).length;
    const totalAttempts = finalButtons.reduce(
      (sum, b) => sum + b.alignment_attempts,
      0
    );

    return {
      detected_buttons: finalButtons,
      analysis_summary: {
        total_elements_found: finalButtons.length,
        image_description: `Simple alignment analysis with max ${this.maxAlignmentAttempts} attempts per button`,
        aligned_buttons: alignedButtons,
        total_alignment_attempts: totalAttempts,
        success_rate: Math.round((alignedButtons / finalButtons.length) * 100),
      },
      analysis_method: "simple_alignment_process",
      total_api_calls: this.detector.apiCallCount,
      processing_confirmation: {
        mode: "SIMPLE_ALIGNMENT_PROCESS",
        initial_detection: "ALL_BUTTONS_AT_ONCE",
        alignment_process: "ONE_BUTTON_AT_A_TIME_MAX_3_ATTEMPTS",
        max_attempts_per_button: this.maxAlignmentAttempts,
        nudging_applied: finalButtons.some((b) => b.nudge_count > 0),
      },
      debug_log:
        typeof debugLogger !== "undefined" ? debugLogger.getLogs() : undefined,
    };
  }

  // Cleanup analysis resources
  cleanupAnalysis() {
    this.overlayGenerator.clearCache();
    this.nudgingEngine.clearHistory();
  }

  // Log analysis error
  logAnalysisError(error) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addLog("error", "❌ Simple Alignment Analysis Failed", {
        error: error.message,
        apiCallsUsed: this.detector.apiCallCount,
      });
    }
    console.error("Error in simple alignment analysis:", error);
  }

  // Public methods for verification
  getAnalysisStats() {
    return {
      mode: this.currentMode,
      max_attempts_per_button: this.maxAlignmentAttempts,
      nudge_distance: this.nudgingEngine.nudgeDistance,
      overlay_cache: this.overlayGenerator.getCacheStats(),
      nudging_stats: this.nudgingEngine.getNudgingStats(),
    };
  }

  getComponents() {
    return {
      alignmentAnalyzer: this.alignmentAnalyzer,
      nudgingEngine: this.nudgingEngine,
      overlayGenerator: this.overlayGenerator,
    };
  }
}
