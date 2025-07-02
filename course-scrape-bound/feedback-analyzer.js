// FeedbackAnalyzer.js - Enhanced visual feedback cycle logic with better error handling
class FeedbackAnalyzer {
  constructor(detector, imageProcessor) {
    this.detector = detector;
    this.imageProcessor = imageProcessor;
  }

  // Main visual feedback analysis with 3 cycles
  async analyzeWithVisualFeedback(originalFile, imageDimensions) {
    console.log("🎯 Starting visual feedback analysis");
    this.detector.apiCallCount = 1; // Count initial analysis

    // Initialize debug logging
    if (typeof debugLogger !== "undefined") {
      debugLogger.clear();
      debugLogger.addLog("info", "Visual Feedback Analysis Started", {
        imageDimensions,
        maxCycles: 3,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Step 1: Initial detection
      const initialAnalysis = await this.detector.analyzeImageForButtons(
        originalFile
      );

      if (typeof debugLogger !== "undefined") {
        debugLogger.addLog("api-call", "Initial Detection Complete", {
          callNumber: 1,
          buttonsFound: initialAnalysis.detected_buttons?.length || 0,
          response: initialAnalysis,
        });
      }

      if (
        !initialAnalysis.detected_buttons ||
        initialAnalysis.detected_buttons.length === 0
      ) {
        return initialAnalysis;
      }

      console.log(
        "✅ Initial detection found " +
          initialAnalysis.detected_buttons.length +
          " buttons"
      );

      // Convert to bounding box format for feedback cycles
      let currentButtons = initialAnalysis.detected_buttons.map((button) => ({
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

      // Step 2: Run feedback cycles
      const feedbackCycles = [];
      let cycleNumber = 1;
      const maxCycles = 3;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 2;

      while (cycleNumber <= maxCycles) {
        console.log(`🔄 Running feedback cycle ${cycleNumber}/${maxCycles}`);

        // Create overlay with bounding boxes and cross-grid system
        const overlayImageUrl =
          await this.imageProcessor.createBoundingBoxOverlay(
            originalFile,
            currentButtons,
            cycleNumber
          );

        if (typeof debugLogger !== "undefined") {
          debugLogger.addLog("cycle", `Feedback Cycle ${cycleNumber}`, {
            cycleNumber,
            buttonsToAnalyze: currentButtons.length,
            overlayCreated: true,
            consecutiveFailures: consecutiveFailures,
          });
        }

        // Get feedback from vision model with retry logic
        this.detector.apiCallCount++;
        const feedbackResult = await this.performVisualFeedbackCycleWithRetry(
          overlayImageUrl,
          currentButtons,
          cycleNumber
        );

        // Store cycle results
        const cycleData = {
          cycle: cycleNumber,
          type: cycleNumber === 1 ? "initial_detection" : "refinement",
          buttons: [...currentButtons],
          overlayImageUrl: overlayImageUrl,
          buttonAnalyses: feedbackResult.buttonAnalyses || [],
          corrections: feedbackResult.corrections || [],
          confidence: feedbackResult.confidence || 50,
          overallAccuracy: feedbackResult.overallAccuracy || 50,
          parsing_successful: feedbackResult.parsing_successful || false,
          raw_response: feedbackResult.raw_response || "",
        };

        feedbackCycles.push(cycleData);

        if (typeof debugLogger !== "undefined") {
          debugLogger.addLog(
            "feedback",
            `Cycle ${cycleNumber} Analysis Complete`,
            {
              cycleNumber,
              corrections: feedbackResult.corrections?.length || 0,
              confidence: feedbackResult.confidence,
              buttonAnalyses: feedbackResult.buttonAnalyses?.length || 0,
              parsing_successful: feedbackResult.parsing_successful,
              response_type: feedbackResult.response_type || "unknown",
            }
          );
        }

        // Check if parsing was successful
        if (!feedbackResult.parsing_successful) {
          consecutiveFailures++;
          console.log(
            `⚠️ Cycle ${cycleNumber} parsing failed (${consecutiveFailures}/${maxConsecutiveFailures} consecutive failures)`
          );

          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log(
              "🛑 Too many consecutive parsing failures, stopping analysis"
            );
            cycleData.termination_reason = "consecutive_parsing_failures";
            break;
          }

          // Continue to next cycle even with parsing failure
          cycleNumber++;
          continue;
        } else {
          // Reset consecutive failures on successful parse
          consecutiveFailures = 0;
        }

        // Apply corrections if any
        if (
          feedbackResult.corrections &&
          feedbackResult.corrections.length > 0
        ) {
          console.log(
            `📝 Applying ${feedbackResult.corrections.length} corrections`
          );
          currentButtons = this.applyBoundingBoxCorrections(
            currentButtons,
            feedbackResult.corrections
          );

          // Add correction metadata to cycle
          cycleData.corrections_applied = feedbackResult.corrections.length;
        } else {
          // Only stop early if we have high confidence AND successful parsing
          if (feedbackResult.overallAccuracy >= 90) {
            console.log(
              "✅ High accuracy achieved with successful parsing - stopping early"
            );
            cycleData.termination_reason = "high_accuracy_achieved";
            break;
          } else {
            console.log(
              `📊 No corrections but accuracy only ${feedbackResult.overallAccuracy}% - continuing`
            );
          }
        }

        cycleNumber++;
      }

      if (typeof debugLogger !== "undefined") {
        debugLogger.addLog("success", "Visual Feedback Analysis Completed", {
          totalCycles: feedbackCycles.length,
          totalApiCalls: this.detector.apiCallCount,
          finalButtonCount: currentButtons.length,
          consecutiveFailures: consecutiveFailures,
          successful_cycles: feedbackCycles.filter((c) => c.parsing_successful)
            .length,
        });
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
      }));

      return {
        detected_buttons: finalButtons,
        analysis_summary: {
          total_elements_found: finalButtons.length,
          image_description: `Visual feedback analysis with ${
            feedbackCycles.length
          } refinement cycles (${
            feedbackCycles.filter((c) => c.parsing_successful).length
          } successful)`,
        },
        analysis_method: "visual_feedback",
        total_api_calls: this.detector.apiCallCount,
        feedback_cycles: feedbackCycles,
        debug_log:
          typeof debugLogger !== "undefined"
            ? debugLogger.getLogs()
            : undefined,
      };
    } catch (error) {
      if (typeof debugLogger !== "undefined") {
        debugLogger.addLog("error", "Visual Feedback Analysis Failed", {
          error: error.message,
          apiCallsUsed: this.detector.apiCallCount,
        });
      }
      console.error("Error in visual feedback analysis:", error);
      throw error;
    }
  }

  // Enhanced feedback cycle with retry logic
  async performVisualFeedbackCycleWithRetry(
    overlayImageUrl,
    currentButtons,
    cycleNumber,
    maxRetries = 2
  ) {
    let lastResult = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(
          `🔄 Cycle ${cycleNumber}, Attempt ${attempt}/${maxRetries + 1}`
        );

        const result = await this.performVisualFeedbackCycle(
          overlayImageUrl,
          currentButtons,
          cycleNumber,
          attempt
        );

        // Check if we got a valid structured response
        if (result.parsing_successful) {
          if (typeof debugLogger !== "undefined") {
            debugLogger.addLog(
              "success",
              `Cycle ${cycleNumber} successful on attempt ${attempt}`,
              {
                attempt,
                corrections: result.corrections?.length || 0,
                confidence: result.confidence,
              }
            );
          }
          return result;
        }

        lastResult = result;

        if (attempt <= maxRetries) {
          console.log(
            `⚠️ Attempt ${attempt} failed, retrying with enhanced prompt...`
          );
          if (typeof debugLogger !== "undefined") {
            debugLogger.addLog(
              "retry",
              `Cycle ${cycleNumber} attempt ${attempt} failed, retrying`,
              {
                attempt,
                response_type: result.response_type,
                raw_response_preview:
                  result.raw_response?.substring(0, 200) + "...",
              }
            );
          }
        }
      } catch (error) {
        console.error(`Error in attempt ${attempt}:`, error);
        if (typeof debugLogger !== "undefined") {
          debugLogger.addLog(
            "error",
            `Cycle ${cycleNumber} attempt ${attempt} error`,
            {
              attempt,
              error: error.message,
            }
          );
        }

        if (attempt === maxRetries + 1) {
          // Return a default failed result
          return {
            corrections: [],
            confidence: 25,
            overallAccuracy: 25,
            parsing_successful: false,
            response_type: "error",
            raw_response: error.message,
            buttonAnalyses: [],
          };
        }
      }
    }

    // If all retries failed, return the last result
    return (
      lastResult || {
        corrections: [],
        confidence: 25,
        overallAccuracy: 25,
        parsing_successful: false,
        response_type: "all_retries_failed",
        raw_response: "All retry attempts failed",
        buttonAnalyses: [],
      }
    );
  }

  // Enhanced feedback cycle with better prompting
  async performVisualFeedbackCycle(
    overlayImageUrl,
    currentButtons,
    cycleNumber,
    attemptNumber = 1
  ) {
    try {
      // Convert overlay URL to blob for API call
      const overlayResponse = await fetch(overlayImageUrl);
      const overlayBlob = await overlayResponse.blob();
      const overlayFile = new File(
        [overlayBlob],
        `overlay_cycle_${cycleNumber}_attempt_${attemptNumber}.png`,
        { type: "image/png" }
      );

      const base64DataURL = await this.detector.fileToBase64DataURL(
        overlayFile
      );

      // Enhanced prompt based on attempt number
      let feedbackPrompt = this.buildFeedbackPrompt(
        currentButtons,
        attemptNumber
      );

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: feedbackPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: base64DataURL,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      };

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: this.detector.headers,
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          "OpenAI API error: " + response.status + " - " + errorText
        );
      }

      const result = await response.json();
      const content = result.choices[0].message.content;

      console.log(
        `Cycle ${cycleNumber} attempt ${attemptNumber} feedback:`,
        content.substring(0, 200) + "..."
      );

      return this.parseFeedbackResponseEnhanced(content);
    } catch (error) {
      console.error(
        `Error in feedback cycle ${cycleNumber} attempt ${attemptNumber}:`,
        error
      );
      throw error;
    }
  }

  // Build enhanced feedback prompt based on attempt number
  buildFeedbackPrompt(currentButtons, attemptNumber) {
    const basePrompt = `CRITICAL: You must respond ONLY with the exact XML format shown below. Do not provide explanations or general advice.

I have drawn bounding boxes around detected UI buttons. Each box is divided into 4 quadrants by a cross:

Quadrant 1 = Top-Left
Quadrant 2 = Top-Right  
Quadrant 3 = Bottom-Left
Quadrant 4 = Bottom-Right

The white dot shows where I think the center of each button is.

BUTTONS TO ANALYZE:
${currentButtons
  .map((btn, idx) => `#${idx + 1}: ${btn.reference_name} (${btn.description})`)
  .join("\n")}

For each numbered button, analyze the image and respond ONLY in this EXACT format:`;

    const formatExample = `
<feedback>
<button_analysis>
<button_number>1</button_number>
<coverage>yes</coverage>
<quadrants_with_button>1,2,3,4</quadrants_with_button>
<center_accurate>yes</center_accurate>
<needs_adjustment>no</needs_adjustment>
<suggested_action>none</suggested_action>
</button_analysis>
<button_analysis>
<button_number>2</button_number>
<coverage>partial</coverage>
<quadrants_with_button>2,4</quadrants_with_button>
<center_accurate>no</center_accurate>
<needs_adjustment>yes</needs_adjustment>
<suggested_action>move box left and up</suggested_action>
</button_analysis>
</feedback>

<corrections>
<correction>
<button_number>2</button_number>
<issue>box positioned too far right and down</issue>
<new_bbox_x>150</new_bbox_x>
<new_bbox_y>200</new_bbox_y>
<new_bbox_width>180</new_bbox_width>
<new_bbox_height>45</new_bbox_height>
</correction>
</corrections>

<summary>
<overall_accuracy>85</overall_accuracy>
<confidence>90</confidence>
<buttons_needing_adjustment>1</buttons_needing_adjustment>
<notes>Most buttons well-positioned, button 2 needs repositioning</notes>
</summary>`;

    // Enhanced prompting for retry attempts
    if (attemptNumber > 1) {
      return (
        basePrompt +
        `

⚠️ PREVIOUS ATTEMPT FAILED - This is retry attempt ${attemptNumber}
YOU MUST respond with the exact XML structure shown below.
DO NOT provide explanations, guidance, or general advice.
ANALYZE THE IMAGE and provide specific feedback for each button.

` +
        formatExample +
        `

RESPOND ONLY WITH XML. NO OTHER TEXT.`
      );
    }

    return (
      basePrompt +
      formatExample +
      `

IMPORTANT: Be very precise about which quadrants contain the actual button content. Respond ONLY with the XML structure above.`
    );
  }

  // Enhanced response parsing with better validation
  parseFeedbackResponseEnhanced(content) {
    try {
      // First, detect if this is a generic/advice response
      const adviceKeywords = [
        "I can guide you",
        "Here's how you can",
        "If you provide",
        "I'm unable to analyze",
        "based on your description",
        "Consider shifting",
        "decide if the box needs",
      ];

      const isGenericAdvice = adviceKeywords.some((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isGenericAdvice) {
        console.log(
          "🚫 Detected generic advice response, not structured feedback"
        );
        return {
          buttonAnalyses: [],
          corrections: [],
          confidence: 30,
          overallAccuracy: 30,
          parsing_successful: false,
          response_type: "generic_advice",
          raw_response: content,
        };
      }

      // Try to parse XML structure
      const feedbackMatch = content.match(/<feedback>([\s\S]*?)<\/feedback>/);
      const correctionsMatch = content.match(
        /<corrections>([\s\S]*?)<\/corrections>/
      );
      const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/);

      if (!feedbackMatch && !correctionsMatch && !summaryMatch) {
        console.log("🚫 No XML structure found in response");
        return {
          buttonAnalyses: [],
          corrections: [],
          confidence: 20,
          overallAccuracy: 20,
          parsing_successful: false,
          response_type: "no_xml_structure",
          raw_response: content,
        };
      }

      const buttonAnalyses = [];
      const corrections = [];
      let confidence = 50;
      let overallAccuracy = 50;

      // Parse button analyses
      if (feedbackMatch) {
        const feedbackXML = feedbackMatch[1];
        const analysisMatches = feedbackXML.match(
          /<button_analysis>([\s\S]*?)<\/button_analysis>/g
        );

        if (analysisMatches) {
          analysisMatches.forEach((analysisXML) => {
            const analysis = {};

            const fields = {
              button_number: /<button_number>(\d+)<\/button_number>/,
              coverage: /<coverage>(.*?)<\/coverage>/,
              quadrants_with_button:
                /<quadrants_with_button>(.*?)<\/quadrants_with_button>/,
              center_accurate: /<center_accurate>(.*?)<\/center_accurate>/,
              needs_adjustment: /<needs_adjustment>(.*?)<\/needs_adjustment>/,
              suggested_action: /<suggested_action>(.*?)<\/suggested_action>/,
            };

            for (const [key, regex] of Object.entries(fields)) {
              const match = analysisXML.match(regex);
              if (match) {
                if (key === "button_number") {
                  analysis[key] = parseInt(match[1]);
                } else if (key === "quadrants_with_button") {
                  analysis[key] = match[1]
                    .split(",")
                    .map((q) => parseInt(q.trim()))
                    .filter((q) => !isNaN(q));
                } else {
                  analysis[key] = match[1].trim();
                }
              }
            }

            if (analysis.button_number !== undefined) {
              buttonAnalyses.push(analysis);
            }
          });
        }
      }

      // Parse corrections
      if (correctionsMatch) {
        const correctionsXML = correctionsMatch[1];
        const correctionMatches = correctionsXML.match(
          /<correction>([\s\S]*?)<\/correction>/g
        );

        if (correctionMatches) {
          correctionMatches.forEach((correctionXML) => {
            const correction = {};

            const fields = {
              button_number: /<button_number>(\d+)<\/button_number>/,
              issue: /<issue>(.*?)<\/issue>/,
              new_bbox_x: /<new_bbox_x>(\d+)<\/new_bbox_x>/,
              new_bbox_y: /<new_bbox_y>(\d+)<\/new_bbox_y>/,
              new_bbox_width: /<new_bbox_width>(\d+)<\/new_bbox_width>/,
              new_bbox_height: /<new_bbox_height>(\d+)<\/new_bbox_height>/,
            };

            for (const [key, regex] of Object.entries(fields)) {
              const match = correctionXML.match(regex);
              if (match) {
                if (key === "issue") {
                  correction[key] = match[1].trim();
                } else {
                  correction[key] = parseInt(match[1]);
                }
              }
            }

            if (correction.button_number !== undefined) {
              corrections.push(correction);
            }
          });
        }
      }

      // Parse summary
      if (summaryMatch) {
        const summaryXML = summaryMatch[1];
        const confidenceMatch = summaryXML.match(
          /<confidence>(\d+)<\/confidence>/
        );
        const accuracyMatch = summaryXML.match(
          /<overall_accuracy>(\d+)<\/overall_accuracy>/
        );

        if (confidenceMatch) confidence = parseInt(confidenceMatch[1]);
        if (accuracyMatch) overallAccuracy = parseInt(accuracyMatch[1]);
      }

      // Determine if parsing was successful
      const parsing_successful =
        (buttonAnalyses.length > 0 || corrections.length > 0) &&
        (feedbackMatch || correctionsMatch || summaryMatch);

      return {
        buttonAnalyses,
        corrections,
        confidence,
        overallAccuracy,
        parsing_successful,
        response_type: parsing_successful ? "structured_xml" : "partial_xml",
        raw_response: content,
      };
    } catch (error) {
      console.error("Error parsing enhanced feedback response:", error);
      return {
        buttonAnalyses: [],
        corrections: [],
        confidence: 25,
        overallAccuracy: 25,
        parsing_successful: false,
        response_type: "parsing_error",
        raw_response: content,
      };
    }
  }

  // Apply corrections to button bounding boxes
  applyBoundingBoxCorrections(buttons, corrections) {
    const correctedButtons = [...buttons];

    corrections.forEach((correction) => {
      const buttonIndex = correction.button_number - 1; // Convert to 0-based index
      if (buttonIndex >= 0 && buttonIndex < correctedButtons.length) {
        const originalBbox = correctedButtons[buttonIndex].bounding_box;

        correctedButtons[buttonIndex].bounding_box = {
          x: correction.new_bbox_x,
          y: correction.new_bbox_y,
          width: correction.new_bbox_width,
          height: correction.new_bbox_height,
        };

        // Add correction metadata
        correctedButtons[buttonIndex].correction_applied = {
          issue: correction.issue,
          original_bbox: originalBbox,
          correction_cycle: correction.cycle || "unknown",
        };
      }
    });

    return correctedButtons;
  }
}
