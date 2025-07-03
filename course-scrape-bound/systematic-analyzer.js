// SystematicAnalyzer.js - Complex systematic analysis with quadrants and overlaps
class SystematicAnalyzer {
  constructor(detector) {
    this.detector = detector;
  }

  // Systematic analysis with quadrants and overlap detection
  async analyzeSystematic(
    overlayImageUrl,
    button,
    buttonNumber,
    cycleNumber,
    maxRetries = 2
  ) {
    // Store button number for parsing methods
    this.currentButtonNumber = buttonNumber;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(
          `🔍 Systematic analysis - Button ${buttonNumber} (${button.reference_name}), Cycle ${cycleNumber}, Attempt ${attempt}`
        );

        const overlayResponse = await fetch(overlayImageUrl);
        const overlayBlob = await overlayResponse.blob();
        const overlayFile = new File(
          [overlayBlob],
          `systematic_${buttonNumber}_cycle_${cycleNumber}_attempt_${attempt}.png`,
          { type: "image/png" }
        );

        const base64DataURL = await this.detector.fileToBase64DataURL(
          overlayFile
        );
        const systematicPrompt = this.buildSystematicPrompt(
          button,
          buttonNumber,
          attempt
        );

        // Log the LLM conversation request
        if (typeof debugLogger !== "undefined") {
          debugLogger.addLLMConversation(
            "systematic_analysis",
            { name: button.reference_name, index: buttonNumber },
            {
              prompt: systematicPrompt,
              imageUrl: overlayImageUrl,
              model: "gpt-4o",
              attempt: attempt,
            },
            {}, // Response will be filled in after API call
            {
              cycle: cycleNumber,
              buttonIndex: buttonNumber,
              analysisType: "SYSTEMATIC_ANALYSIS",
            }
          );
        }

        const requestBody = {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: systematicPrompt,
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
          max_tokens: 1500,
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

        const parsed = this.parseSystematicResponse(
          content,
          button,
          buttonNumber
        );

        // Update the LLM conversation with the response
        if (typeof debugLogger !== "undefined") {
          const lastConversation =
            debugLogger.llmConversations[
              debugLogger.llmConversations.length - 1
            ];
          if (lastConversation) {
            lastConversation.response = {
              raw: content,
              parsed: parsed,
              parsing_successful: parsed.parsing_successful,
              response_type: parsed.response_type,
            };
          }
        }

        console.log(
          `📋 Button ${buttonNumber} systematic result: ${parsed.response_type}, Success: ${parsed.parsing_successful}`
        );

        if (parsed.parsing_successful || attempt === maxRetries + 1) {
          return parsed;
        }

        console.log(
          `⚠️ Button ${buttonNumber} systematic attempt ${attempt} failed, retrying...`
        );
      } catch (error) {
        console.error(
          `❌ Error in systematic analysis attempt ${attempt}:`,
          error
        );
        if (attempt === maxRetries + 1) {
          return {
            corrections: [],
            confidence: 25,
            overallAccuracy: 25,
            parsing_successful: false,
            response_type: "systematic_error",
            raw_response: error.message,
            buttonAnalyses: [],
          };
        }
      }
    }
  }

  // Build systematic analysis prompt with quadrants and overlaps
  buildSystematicPrompt(button, buttonNumber, attemptNumber) {
    const basePrompt = `🎯 ENHANCED SYSTEMATIC SINGLE BUTTON ANALYSIS

You are analyzing EXACTLY ONE button in this image. There is only ONE red bounding box visible.

BUTTON BEING ANALYZED:
- Name: "${button.reference_name}"
- Description: "${button.description}"
- Type: ${button.element_type}

VISUAL ELEMENTS IN IMAGE:
- ONE red bounding box with white overlay (this is the ONLY button you should analyze)
- The box is divided into 4 quadrants by red dashed lines
- Quadrant numbers are marked: 1 (top-left), 2 (top-right), 3 (bottom-left), 4 (bottom-right)
- Large white dot with black border shows the current center point
- Background is slightly dimmed to highlight the target button

SYSTEMATIC ANALYSIS STEPS:

STEP 1: OVERLAP VERIFICATION
- Does the red bounding box overlap the actual "${button.reference_name}" button AT ALL?
- Look carefully - is ANY part of the actual button covered by the red box?
- Estimate what percentage of the button is covered (0-100%)

STEP 2A: IF NO OVERLAP
- What compass direction is the actual button from the bounding box?
- Be specific: North, South, East, West, Northeast, Northwest, Southeast, Southwest

STEP 2B: IF YES OVERLAP  
- Which quadrants (1, 2, 3, 4) contain parts of the actual button?
- List ALL quadrants that have any part of the button

STEP 3: CENTER POINT ANALYSIS
- Is the large white dot positioned over any part of the actual button?
- How would you rate the dot position: perfect, good, poor, or off-target?

RESPOND ONLY in this XML format:

<systematic_analysis>
<overlap_check>
<box_overlaps_button>yes</box_overlaps_button>
<overlap_percentage>85</overlap_percentage>
</overlap_check>
<direction_analysis>
<button_direction_from_box>none</button_direction_from_box>
<compass_direction>none</compass_direction>
<quadrants_with_button>1,2,3,4</quadrants_with_button>
</direction_analysis>
<center_analysis>
<white_dot_on_button>yes</white_dot_on_button>
<dot_position_quality>good</dot_position_quality>
</center_analysis>
<corrections>
<correction>
<needs_correction>no</needs_correction>
<correction_type>none</correction_type>
<move_direction>none</move_direction>
<new_bbox_x>150</new_bbox_x>
<new_bbox_y>200</new_bbox_y>
<new_bbox_width>180</new_bbox_width>
<new_bbox_height>45</new_bbox_height>
</correction>
</corrections>
<assessment>
<confidence>92</confidence>
<accuracy>88</accuracy>
<analysis_notes>Button well positioned, minor adjustment possible</analysis_notes>
</assessment>
</systematic_analysis>

CRITICAL INSTRUCTIONS:
- This is SINGLE BUTTON analysis - only analyze the button in the red box
- Follow the systematic steps in order
- Be precise about overlap percentages and quadrant identification  
- Use exact compass directions for positioning
- Respond with the exact XML structure shown above`;

    if (attemptNumber > 1) {
      return (
        basePrompt +
        `\n\n⚠️ RETRY ATTEMPT ${attemptNumber} - PREVIOUS ANALYSIS FAILED\nThis is a SINGLE BUTTON analysis. Follow the systematic steps above EXACTLY.\nYou MUST respond with the exact XML structure shown above.\n\nRESPOND ONLY WITH XML. NO explanations outside XML tags.`
      );
    }

    return basePrompt;
  }

  // Parse systematic response with flexible, non-strict patterns
  parseSystematicResponse(content, button, buttonNumber) {
    try {
      console.log(
        `🔍 Parsing systematic response for button ${buttonNumber} with flexible patterns`
      );

      // Check for generic responses
      if (this.isGenericResponse(content)) {
        console.log(
          `⚠️ Generic advice response detected for button ${buttonNumber}`
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

      // Try multiple parsing strategies with increasing flexibility
      let systematicData = null;
      let parseMethod = "unknown";

      // Strategy 1: Strict XML parsing
      systematicData = this.parseSystematicXMLStrict(content);
      if (systematicData) {
        parseMethod = "strict_xml";
        console.log(
          `✅ Button ${buttonNumber}: Parsed systematic with strict XML`
        );
      }

      // Strategy 2: Flexible XML parsing
      if (!systematicData) {
        systematicData = this.parseSystematicXMLFlexible(content);
        if (systematicData) {
          parseMethod = "flexible_xml";
          console.log(
            `✅ Button ${buttonNumber}: Parsed systematic with flexible XML`
          );
        }
      }

      // Strategy 3: Section-based parsing (parse each section independently)
      if (!systematicData) {
        systematicData = this.parseSystematicSectionBased(content);
        if (systematicData) {
          parseMethod = "section_based";
          console.log(
            `✅ Button ${buttonNumber}: Parsed systematic with section-based approach`
          );
        }
      }

      // Strategy 4: Pattern-based extraction
      if (!systematicData) {
        systematicData = this.parseSystematicPatterns(content);
        if (systematicData) {
          parseMethod = "pattern_based";
          console.log(
            `✅ Button ${buttonNumber}: Parsed systematic with pattern matching`
          );
        }
      }

      if (!systematicData) {
        console.log(
          `⚠️ All systematic parsing strategies failed for button ${buttonNumber}`
        );
        return {
          buttonAnalyses: [],
          corrections: [],
          confidence: 20,
          overallAccuracy: 20,
          parsing_successful: false,
          response_type: "no_systematic_data",
          raw_response: content,
          parse_attempts: [
            "strict_xml",
            "flexible_xml",
            "section_based",
            "pattern_based",
          ],
        };
      }

      // Create button analysis from parsed data
      const buttonAnalyses = [
        {
          button_number: buttonNumber,
          box_overlaps_button: systematicData.boxOverlapsButton || false,
          overlap_percentage: systematicData.overlapPercentage || 0,
          button_direction_from_box: systematicData.buttonDirection || "none",
          compass_direction: systematicData.compassDirection || "none",
          quadrants_with_button: systematicData.quadrantsWithButton || [],
          white_dot_on_button: systematicData.whiteDotOnButton || false,
          dot_position_quality: systematicData.dotPositionQuality || "unknown",
          systematic_analysis: true,
          enhanced_analysis: true,
          parse_method: parseMethod,
        },
      ];

      const parsing_successful =
        systematicData.boxOverlapsButton !== undefined ||
        systematicData.corrections.length > 0;

      if (typeof debugLogger !== "undefined") {
        debugLogger.addLog(
          "systematic-analysis",
          `✅ Flexible systematic analysis for button ${buttonNumber}`,
          {
            buttonNumber,
            buttonName: button.reference_name,
            boxOverlapsButton: systematicData.boxOverlapsButton,
            overlapPercentage: systematicData.overlapPercentage,
            compassDirection: systematicData.compassDirection,
            quadrantsWithButton: systematicData.quadrantsWithButton,
            whiteDotOnButton: systematicData.whiteDotOnButton,
            corrections: systematicData.corrections.length,
            parsing_successful,
            confidence: systematicData.confidence,
            overallAccuracy: systematicData.overallAccuracy,
            parseMethod: parseMethod,
          }
        );
      }

      console.log(
        `📊 Button ${buttonNumber} flexible systematic parsing: ${
          parsing_successful ? "SUCCESS" : "FAILED"
        } (${parseMethod}), Confidence: ${systematicData.confidence}%`
      );

      return {
        buttonAnalyses,
        corrections: systematicData.corrections,
        confidence: systematicData.confidence,
        overallAccuracy: systematicData.overallAccuracy,
        parsing_successful,
        response_type: `systematic_${parseMethod}`,
        raw_response: content,
        enhanced_analysis: true,
        parse_method: parseMethod,
      };
    } catch (error) {
      console.error(
        `❌ Error parsing systematic response for button ${buttonNumber}:`,
        error
      );
      return {
        buttonAnalyses: [],
        corrections: [],
        confidence: 25,
        overallAccuracy: 25,
        parsing_successful: false,
        response_type: "systematic_parsing_error",
        raw_response: content,
        error: error.message,
      };
    }
  }

  // Strategy 1: Strict XML parsing (original method)
  parseSystematicXMLStrict(content) {
    const analysisMatch = content.match(
      /<systematic_analysis>([\s\S]*?)<\/systematic_analysis>/
    );
    if (!analysisMatch) return null;

    const analysisXML = analysisMatch[1];
    const overlapData = this.parseOverlapSection(analysisXML);
    const directionData = this.parseDirectionSection(analysisXML);
    const centerData = this.parseCenterSection(analysisXML);
    const correctionsData = this.parseCorrectionsSection(
      analysisXML,
      this.currentButtonNumber || 1
    );
    const assessmentData = this.parseAssessmentSection(analysisXML);

    return {
      boxOverlapsButton: overlapData.boxOverlapsButton,
      overlapPercentage: overlapData.overlapPercentage,
      buttonDirection: directionData.buttonDirection,
      compassDirection: directionData.compassDirection,
      quadrantsWithButton: directionData.quadrantsWithButton,
      whiteDotOnButton: centerData.whiteDotOnButton,
      dotPositionQuality: centerData.dotPositionQuality,
      corrections: correctionsData,
      confidence: assessmentData.confidence,
      overallAccuracy: assessmentData.overallAccuracy,
    };
  }

  // Original parsing methods (restored for compatibility)
  parseOverlapSection(analysisXML) {
    const overlapMatch = analysisXML.match(
      /<overlap_check>([\s\S]*?)<\/overlap_check>/
    );
    let boxOverlapsButton = false;
    let overlapPercentage = 0;

    if (overlapMatch) {
      const overlapXML = overlapMatch[1];
      const overlapCheck = overlapXML.match(
        /<box_overlaps_button>(.*?)<\/box_overlaps_button>/
      );
      const percentageCheck = overlapXML.match(
        /<overlap_percentage>(\d+)<\/overlap_percentage>/
      );

      if (overlapCheck) {
        const overlapValue = overlapCheck[1].trim().toLowerCase();
        boxOverlapsButton = overlapValue === "yes" || overlapValue === "true";
      }
      if (percentageCheck) {
        overlapPercentage = parseInt(percentageCheck[1]);
      }
    }

    return { boxOverlapsButton, overlapPercentage };
  }

  parseDirectionSection(analysisXML) {
    const directionMatch = analysisXML.match(
      /<direction_analysis>([\s\S]*?)<\/direction_analysis>/
    );
    let buttonDirection = "none";
    let compassDirection = "none";
    let quadrantsWithButton = [];

    if (directionMatch) {
      const directionXML = directionMatch[1];
      const directionCheck = directionXML.match(
        /<button_direction_from_box>(.*?)<\/button_direction_from_box>/
      );
      const compassCheck = directionXML.match(
        /<compass_direction>(.*?)<\/compass_direction>/
      );
      const quadrantsCheck = directionXML.match(
        /<quadrants_with_button>(.*?)<\/quadrants_with_button>/
      );

      if (directionCheck) {
        buttonDirection = directionCheck[1].trim();
      }
      if (compassCheck) {
        compassDirection = compassCheck[1].trim();
      }
      if (quadrantsCheck && quadrantsCheck[1].trim() !== "none") {
        quadrantsWithButton = quadrantsCheck[1]
          .split(",")
          .map((q) => parseInt(q.trim()))
          .filter((q) => !isNaN(q) && q >= 1 && q <= 4);
      }
    }

    return { buttonDirection, compassDirection, quadrantsWithButton };
  }

  parseCenterSection(analysisXML) {
    const centerMatch = analysisXML.match(
      /<center_analysis>([\s\S]*?)<\/center_analysis>/
    );
    let whiteDotOnButton = false;
    let dotPositionQuality = "unknown";

    if (centerMatch) {
      const centerXML = centerMatch[1];
      const dotCheck = centerXML.match(
        /<white_dot_on_button>(.*?)<\/white_dot_on_button>/
      );
      const qualityCheck = centerXML.match(
        /<dot_position_quality>(.*?)<\/dot_position_quality>/
      );

      if (dotCheck) {
        const dotValue = dotCheck[1].trim().toLowerCase();
        whiteDotOnButton = dotValue === "yes" || dotValue === "true";
      }
      if (qualityCheck) {
        dotPositionQuality = qualityCheck[1].trim();
      }
    }

    return { whiteDotOnButton, dotPositionQuality };
  }

  parseCorrectionsSection(analysisXML, buttonNumber) {
    const correctionsMatch = analysisXML.match(
      /<corrections>([\s\S]*?)<\/corrections>/
    );
    const corrections = [];

    if (correctionsMatch) {
      const correctionsXML = correctionsMatch[1];
      const correctionMatches = correctionsXML.match(
        /<correction>([\s\S]*?)<\/correction>/g
      );

      if (correctionMatches) {
        correctionMatches.forEach((correctionXML) => {
          const correction = { button_number: buttonNumber };

          const fields = {
            needs_correction: /<needs_correction>(.*?)<\/needs_correction>/,
            correction_type: /<correction_type>(.*?)<\/correction_type>/,
            move_direction: /<move_direction>(.*?)<\/move_direction>/,
            new_bbox_x: /<new_bbox_x>(\d+)<\/new_bbox_x>/,
            new_bbox_y: /<new_bbox_y>(\d+)<\/new_bbox_y>/,
            new_bbox_width: /<new_bbox_width>(\d+)<\/new_bbox_width>/,
            new_bbox_height: /<new_bbox_height>(\d+)<\/new_bbox_height>/,
          };

          for (const [key, regex] of Object.entries(fields)) {
            const match = correctionXML.match(regex);
            if (match) {
              if (
                key === "needs_correction" ||
                key === "correction_type" ||
                key === "move_direction"
              ) {
                correction[key] = match[1].trim();
              } else {
                correction[key] = parseInt(match[1]);
              }
            }
          }

          // Only add correction if it's needed and has valid coordinates
          if (
            correction.needs_correction === "yes" &&
            !isNaN(correction.new_bbox_x) &&
            !isNaN(correction.new_bbox_y)
          ) {
            corrections.push(correction);
          }
        });
      }
    }

    return corrections;
  }

  parseAssessmentSection(analysisXML) {
    const assessmentMatch = analysisXML.match(
      /<assessment>([\s\S]*?)<\/assessment>/
    );
    let confidence = 50;
    let overallAccuracy = 50;

    if (assessmentMatch) {
      const assessmentXML = assessmentMatch[1];
      const confidenceMatch = assessmentXML.match(
        /<confidence>(\d+)<\/confidence>/
      );
      const accuracyMatch = assessmentXML.match(/<accuracy>(\d+)<\/accuracy>/);

      if (confidenceMatch) {
        confidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[1])));
      }
      if (accuracyMatch) {
        overallAccuracy = Math.min(
          100,
          Math.max(0, parseInt(accuracyMatch[1]))
        );
      }
    }

    return { confidence, overallAccuracy };
  }

  // Strategy 2: Flexible XML parsing (handle variations and whitespace)
  parseSystematicXMLFlexible(content) {
    // More flexible regex patterns for the main container
    const flexiblePatterns = [
      /<systematic_analysis\s*>([\s\S]*?)<\/\s*systematic_analysis\s*>/i,
      /<analysis\s*>([\s\S]*?)<\/\s*analysis\s*>/i,
      /<systematic[^>]*>([\s\S]*?)<\/\s*systematic[^>]*>/i,
    ];

    let analysisXML = null;
    for (const pattern of flexiblePatterns) {
      const match = content.match(pattern);
      if (match) {
        analysisXML = match[1];
        break;
      }
    }

    if (!analysisXML) return null;

    // Parse sections with flexible patterns
    const overlapData = this.parseOverlapSectionFlexible(analysisXML);
    const directionData = this.parseDirectionSectionFlexible(analysisXML);
    const centerData = this.parseCenterSectionFlexible(analysisXML);
    const correctionsData = this.parseCorrectionsSectionFlexible(
      analysisXML,
      buttonNumber
    );
    const assessmentData = this.parseAssessmentSectionFlexible(analysisXML);

    return {
      boxOverlapsButton: overlapData.boxOverlapsButton,
      overlapPercentage: overlapData.overlapPercentage,
      buttonDirection: directionData.buttonDirection,
      compassDirection: directionData.compassDirection,
      quadrantsWithButton: directionData.quadrantsWithButton,
      whiteDotOnButton: centerData.whiteDotOnButton,
      dotPositionQuality: centerData.dotPositionQuality,
      corrections: correctionsData,
      confidence: assessmentData.confidence,
      overallAccuracy: assessmentData.overallAccuracy,
    };
  }

  // Strategy 3: Section-based parsing (each section independently)
  parseSystematicSectionBased(content) {
    const systematicData = {
      boxOverlapsButton: false,
      overlapPercentage: 0,
      buttonDirection: "none",
      compassDirection: "none",
      quadrantsWithButton: [],
      whiteDotOnButton: false,
      dotPositionQuality: "unknown",
      corrections: [],
      confidence: 50,
      overallAccuracy: 50,
    };

    // Extract overlap information with various section patterns
    const overlapPatterns = [
      /<overlap[^>]*>([\s\S]*?)<\/overlap[^>]*>/i,
      /<overlap_check\s*>([\s\S]*?)<\/overlap_check\s*>/i,
    ];

    for (const pattern of overlapPatterns) {
      const match = content.match(pattern);
      if (match) {
        const overlapData = this.parseOverlapSectionFlexible(match[1]);
        systematicData.boxOverlapsButton = overlapData.boxOverlapsButton;
        systematicData.overlapPercentage = overlapData.overlapPercentage;
        break;
      }
    }

    // Extract direction information
    const directionPatterns = [
      /<direction[^>]*>([\s\S]*?)<\/direction[^>]*>/i,
      /<direction_analysis\s*>([\s\S]*?)<\/direction_analysis\s*>/i,
    ];

    for (const pattern of directionPatterns) {
      const match = content.match(pattern);
      if (match) {
        const directionData = this.parseDirectionSectionFlexible(match[1]);
        systematicData.buttonDirection = directionData.buttonDirection;
        systematicData.compassDirection = directionData.compassDirection;
        systematicData.quadrantsWithButton = directionData.quadrantsWithButton;
        break;
      }
    }

    // Extract correction information
    const correctionPatterns = [
      /<corrections?\s*>([\s\S]*?)<\/corrections?\s*>/i,
      /<correction[^>]*>([\s\S]*?)<\/correction[^>]*>/i,
    ];

    for (const pattern of correctionPatterns) {
      const match = content.match(pattern);
      if (match) {
        systematicData.corrections = this.parseCorrectionsSectionFlexible(
          match[1],
          buttonNumber
        );
        break;
      }
    }

    // Return data if we found some useful information
    if (
      systematicData.boxOverlapsButton !== undefined ||
      systematicData.corrections.length > 0
    ) {
      return systematicData;
    }

    return null;
  }

  // Strategy 4: Pattern-based extraction for systematic analysis
  parseSystematicPatterns(content) {
    const systematicData = {
      boxOverlapsButton: false,
      overlapPercentage: 0,
      buttonDirection: "none",
      compassDirection: "none",
      quadrantsWithButton: [],
      whiteDotOnButton: false,
      dotPositionQuality: "unknown",
      corrections: [],
      confidence: 50,
      overallAccuracy: 50,
    };

    const lowercaseContent = content.toLowerCase();

    // Pattern matching for overlap
    if (
      lowercaseContent.includes("overlaps") ||
      lowercaseContent.includes("covers") ||
      lowercaseContent.includes("box contains")
    ) {
      systematicData.boxOverlapsButton = true;

      // Extract percentage if mentioned
      const percentMatch = content.match(/(\d+)%/);
      if (percentMatch) {
        systematicData.overlapPercentage = parseInt(percentMatch[1]);
      }
    } else if (
      lowercaseContent.includes("no overlap") ||
      lowercaseContent.includes("doesn't overlap") ||
      lowercaseContent.includes("outside") ||
      lowercaseContent.includes("separate")
    ) {
      systematicData.boxOverlapsButton = false;
      systematicData.overlapPercentage = 0;
    }

    // Pattern matching for compass directions
    const compassPatterns = [
      { pattern: /(north|up)/i, direction: "north" },
      { pattern: /(south|down)/i, direction: "south" },
      { pattern: /(east|right)/i, direction: "east" },
      { pattern: /(west|left)/i, direction: "west" },
      { pattern: /northeast|north.*east|up.*right/i, direction: "northeast" },
      { pattern: /northwest|north.*west|up.*left/i, direction: "northwest" },
      { pattern: /southeast|south.*east|down.*right/i, direction: "southeast" },
      { pattern: /southwest|south.*west|down.*left/i, direction: "southwest" },
    ];

    for (const { pattern, direction } of compassPatterns) {
      if (pattern.test(content)) {
        systematicData.compassDirection = direction;
        break;
      }
    }

    // Pattern matching for quadrants
    const quadrantMatches = content.match(
      /quadrant[s]?\s*(\d+(?:\s*,\s*\d+)*)/i
    );
    if (quadrantMatches) {
      systematicData.quadrantsWithButton = quadrantMatches[1]
        .split(",")
        .map((q) => parseInt(q.trim()))
        .filter((q) => q >= 1 && q <= 4);
    }

    // Pattern matching for white dot
    if (
      lowercaseContent.includes("dot on button") ||
      lowercaseContent.includes("dot over") ||
      (lowercaseContent.includes("white dot") &&
        lowercaseContent.includes("button"))
    ) {
      systematicData.whiteDotOnButton = true;
    }

    // Pattern matching for confidence
    const confidenceMatch = content.match(/(\d+)%?\s*(confident|confidence)/i);
    if (confidenceMatch) {
      systematicData.confidence = parseInt(confidenceMatch[1]);
      systematicData.overallAccuracy = systematicData.confidence;
    }

    // Look for correction needs
    if (
      lowercaseContent.includes("needs correction") ||
      lowercaseContent.includes("should move") ||
      lowercaseContent.includes("adjust") ||
      lowercaseContent.includes("reposition")
    ) {
      // Create a basic correction entry
      systematicData.corrections.push({
        button_number: buttonNumber,
        needs_correction: "yes",
        correction_type: "systematic_adjustment",
        move_direction: systematicData.compassDirection || "unknown",
      });
    }

    // Return data if we found meaningful information
    if (
      systematicData.boxOverlapsButton !== undefined ||
      systematicData.compassDirection !== "none" ||
      systematicData.corrections.length > 0
    ) {
      return systematicData;
    }

    return null;
  }

  // Flexible parsing methods for different sections

  // Helper method to check for generic responses
  isGenericResponse(content) {
    const adviceKeywords = [
      "I cannot analyze",
      "I'm unable to",
      "provide specific details",
      "based on your description",
      "I can't see the specific",
      "without being able to see",
      "I don't have the ability",
    ];

    return adviceKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Flexible overlap section parsing
  parseOverlapSectionFlexible(sectionXML) {
    let boxOverlapsButton = false;
    let overlapPercentage = 0;

    // Multiple patterns for overlap detection
    const overlapPatterns = [
      /<box[_\s]*overlaps[_\s]*button\s*>(.*?)<\/box[_\s]*overlaps[_\s]*button\s*>/i,
      /<overlaps\s*>(.*?)<\/overlaps\s*>/i,
      /<overlap\s*>(.*?)<\/overlap\s*>/i,
    ];

    for (const pattern of overlapPatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        const value = match[1].trim().toLowerCase();
        boxOverlapsButton = value === "yes" || value === "true";
        break;
      }
    }

    // Multiple patterns for percentage
    const percentagePatterns = [
      /<overlap[_\s]*percentage\s*>(\d+)<\/overlap[_\s]*percentage\s*>/i,
      /<percentage\s*>(\d+)<\/percentage\s*>/i,
      /(\d+)%/,
    ];

    for (const pattern of percentagePatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        overlapPercentage = parseInt(match[1]);
        break;
      }
    }

    return { boxOverlapsButton, overlapPercentage };
  }

  // Flexible direction section parsing
  parseDirectionSectionFlexible(sectionXML) {
    let buttonDirection = "none";
    let compassDirection = "none";
    let quadrantsWithButton = [];

    // Multiple patterns for button direction
    const buttonDirectionPatterns = [
      /<button[_\s]*direction[_\s]*from[_\s]*box\s*>(.*?)<\/button[_\s]*direction[_\s]*from[_\s]*box\s*>/i,
      /<direction[_\s]*from[_\s]*box\s*>(.*?)<\/direction[_\s]*from[_\s]*box\s*>/i,
      /<button[_\s]*direction\s*>(.*?)<\/button[_\s]*direction\s*>/i,
    ];

    for (const pattern of buttonDirectionPatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        buttonDirection = match[1].trim();
        break;
      }
    }

    // Multiple patterns for compass direction
    const compassPatterns = [
      /<compass[_\s]*direction\s*>(.*?)<\/compass[_\s]*direction\s*>/i,
      /<direction\s*>(.*?)<\/direction\s*>/i,
      /<compass\s*>(.*?)<\/compass\s*>/i,
    ];

    for (const pattern of compassPatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        compassDirection = match[1].trim();
        break;
      }
    }

    // Multiple patterns for quadrants
    const quadrantPatterns = [
      /<quadrants[_\s]*with[_\s]*button\s*>(.*?)<\/quadrants[_\s]*with[_\s]*button\s*>/i,
      /<quadrants\s*>(.*?)<\/quadrants\s*>/i,
      /<button[_\s]*quadrants\s*>(.*?)<\/button[_\s]*quadrants\s*>/i,
    ];

    for (const pattern of quadrantPatterns) {
      const match = sectionXML.match(pattern);
      if (match && match[1].trim() !== "none") {
        quadrantsWithButton = match[1]
          .split(/[,\s]+/)
          .map((q) => parseInt(q.trim()))
          .filter((q) => !isNaN(q) && q >= 1 && q <= 4);
        break;
      }
    }

    return { buttonDirection, compassDirection, quadrantsWithButton };
  }

  // Flexible center section parsing
  parseCenterSectionFlexible(sectionXML) {
    let whiteDotOnButton = false;
    let dotPositionQuality = "unknown";

    // Multiple patterns for white dot detection
    const dotPatterns = [
      /<white[_\s]*dot[_\s]*on[_\s]*button\s*>(.*?)<\/white[_\s]*dot[_\s]*on[_\s]*button\s*>/i,
      /<dot[_\s]*on[_\s]*button\s*>(.*?)<\/dot[_\s]*on[_\s]*button\s*>/i,
      /<dot\s*>(.*?)<\/dot\s*>/i,
    ];

    for (const pattern of dotPatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        const value = match[1].trim().toLowerCase();
        whiteDotOnButton = value === "yes" || value === "true";
        break;
      }
    }

    // Multiple patterns for dot quality
    const qualityPatterns = [
      /<dot[_\s]*position[_\s]*quality\s*>(.*?)<\/dot[_\s]*position[_\s]*quality\s*>/i,
      /<position[_\s]*quality\s*>(.*?)<\/position[_\s]*quality\s*>/i,
      /<quality\s*>(.*?)<\/quality\s*>/i,
    ];

    for (const pattern of qualityPatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        dotPositionQuality = match[1].trim();
        break;
      }
    }

    return { whiteDotOnButton, dotPositionQuality };
  }

  // Flexible corrections section parsing
  parseCorrectionsSectionFlexible(sectionXML, buttonNumber) {
    const corrections = [];

    // Multiple patterns for individual corrections
    const correctionPatterns = [
      /<correction\s*>([\s\S]*?)<\/correction\s*>/gi,
      /<fix\s*>([\s\S]*?)<\/fix\s*>/gi,
      /<adjustment\s*>([\s\S]*?)<\/adjustment\s*>/gi,
    ];

    for (const pattern of correctionPatterns) {
      const matches = sectionXML.matchAll(pattern);
      for (const match of matches) {
        const correctionXML = match[1];
        const correction = { button_number: buttonNumber };

        // Flexible field extraction for corrections
        const correctionFields = {
          needs_correction: [
            /<needs[_\s]*correction\s*>(.*?)<\/needs[_\s]*correction\s*>/i,
            /<correction[_\s]*needed\s*>(.*?)<\/correction[_\s]*needed\s*>/i,
            /<needs[_\s]*adjustment\s*>(.*?)<\/needs[_\s]*adjustment\s*>/i,
          ],
          correction_type: [
            /<correction[_\s]*type\s*>(.*?)<\/correction[_\s]*type\s*>/i,
            /<type\s*>(.*?)<\/type\s*>/i,
          ],
          move_direction: [
            /<move[_\s]*direction\s*>(.*?)<\/move[_\s]*direction\s*>/i,
            /<direction\s*>(.*?)<\/direction\s*>/i,
          ],
          new_bbox_x: [
            /<new[_\s]*bbox[_\s]*x\s*>(\d+)<\/new[_\s]*bbox[_\s]*x\s*>/i,
            /<x\s*>(\d+)<\/x\s*>/i,
          ],
          new_bbox_y: [
            /<new[_\s]*bbox[_\s]*y\s*>(\d+)<\/new[_\s]*bbox[_\s]*y\s*>/i,
            /<y\s*>(\d+)<\/y\s*>/i,
          ],
        };

        // Try multiple patterns for each field
        for (const [field, patterns] of Object.entries(correctionFields)) {
          for (const pattern of patterns) {
            const fieldMatch = correctionXML.match(pattern);
            if (fieldMatch) {
              if (
                field.includes("bbox") ||
                field === "new_x" ||
                field === "new_y"
              ) {
                correction[field] = parseInt(fieldMatch[1]);
              } else {
                correction[field] = fieldMatch[1].trim();
              }
              break;
            }
          }
        }

        // Only add correction if it has meaningful data
        if (
          correction.needs_correction === "yes" ||
          (correction.new_bbox_x && correction.new_bbox_y)
        ) {
          corrections.push(correction);
        }
      }

      if (corrections.length > 0) break; // Found corrections, no need to try other patterns
    }

    return corrections;
  }

  // Flexible assessment section parsing
  parseAssessmentSectionFlexible(sectionXML) {
    let confidence = 50;
    let overallAccuracy = 50;

    // Multiple patterns for confidence
    const confidencePatterns = [
      /<confidence\s*>(\d+)<\/confidence\s*>/i,
      /<confidence[_\s]*level\s*>(\d+)<\/confidence[_\s]*level\s*>/i,
      /confidence[:\s]*(\d+)/i,
      /(\d+)%?\s*confident/i,
    ];

    for (const pattern of confidencePatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        confidence = Math.min(100, Math.max(0, parseInt(match[1])));
        break;
      }
    }

    // Multiple patterns for accuracy
    const accuracyPatterns = [
      /<accuracy\s*>(\d+)<\/accuracy\s*>/i,
      /<overall[_\s]*accuracy\s*>(\d+)<\/overall[_\s]*accuracy\s*>/i,
      /accuracy[:\s]*(\d+)/i,
      /(\d+)%?\s*accurate/i,
    ];

    for (const pattern of accuracyPatterns) {
      const match = sectionXML.match(pattern);
      if (match) {
        overallAccuracy = Math.min(100, Math.max(0, parseInt(match[1])));
        break;
      }
    }

    return { confidence, overallAccuracy };
  }

  parseDirectionSection(analysisXML) {
    const directionMatch = analysisXML.match(
      /<direction_analysis>([\s\S]*?)<\/direction_analysis>/
    );
    let buttonDirection = "none";
    let compassDirection = "none";
    let quadrantsWithButton = [];

    if (directionMatch) {
      const directionXML = directionMatch[1];
      const directionCheck = directionXML.match(
        /<button_direction_from_box>(.*?)<\/button_direction_from_box>/
      );
      const compassCheck = directionXML.match(
        /<compass_direction>(.*?)<\/compass_direction>/
      );
      const quadrantsCheck = directionXML.match(
        /<quadrants_with_button>(.*?)<\/quadrants_with_button>/
      );

      if (directionCheck) {
        buttonDirection = directionCheck[1].trim();
      }
      if (compassCheck) {
        compassDirection = compassCheck[1].trim();
      }
      if (quadrantsCheck && quadrantsCheck[1].trim() !== "none") {
        quadrantsWithButton = quadrantsCheck[1]
          .split(",")
          .map((q) => parseInt(q.trim()))
          .filter((q) => !isNaN(q) && q >= 1 && q <= 4);
      }
    }

    return { buttonDirection, compassDirection, quadrantsWithButton };
  }

  parseCenterSection(analysisXML) {
    const centerMatch = analysisXML.match(
      /<center_analysis>([\s\S]*?)<\/center_analysis>/
    );
    let whiteDotOnButton = false;
    let dotPositionQuality = "unknown";

    if (centerMatch) {
      const centerXML = centerMatch[1];
      const dotCheck = centerXML.match(
        /<white_dot_on_button>(.*?)<\/white_dot_on_button>/
      );
      const qualityCheck = centerXML.match(
        /<dot_position_quality>(.*?)<\/dot_position_quality>/
      );

      if (dotCheck) {
        const dotValue = dotCheck[1].trim().toLowerCase();
        whiteDotOnButton = dotValue === "yes" || dotValue === "true";
      }
      if (qualityCheck) {
        dotPositionQuality = qualityCheck[1].trim();
      }
    }

    return { whiteDotOnButton, dotPositionQuality };
  }

  parseCorrectionsSection(analysisXML, buttonNumber) {
    const correctionsMatch = analysisXML.match(
      /<corrections>([\s\S]*?)<\/corrections>/
    );
    const corrections = [];

    if (correctionsMatch) {
      const correctionsXML = correctionsMatch[1];
      const correctionMatches = correctionsXML.match(
        /<correction>([\s\S]*?)<\/correction>/g
      );

      if (correctionMatches) {
        correctionMatches.forEach((correctionXML) => {
          const correction = { button_number: buttonNumber };

          const fields = {
            needs_correction: /<needs_correction>(.*?)<\/needs_correction>/,
            correction_type: /<correction_type>(.*?)<\/correction_type>/,
            move_direction: /<move_direction>(.*?)<\/move_direction>/,
            new_bbox_x: /<new_bbox_x>(\d+)<\/new_bbox_x>/,
            new_bbox_y: /<new_bbox_y>(\d+)<\/new_bbox_y>/,
            new_bbox_width: /<new_bbox_width>(\d+)<\/new_bbox_width>/,
            new_bbox_height: /<new_bbox_height>(\d+)<\/new_bbox_height>/,
          };

          for (const [key, regex] of Object.entries(fields)) {
            const match = correctionXML.match(regex);
            if (match) {
              if (
                key === "needs_correction" ||
                key === "correction_type" ||
                key === "move_direction"
              ) {
                correction[key] = match[1].trim();
              } else {
                correction[key] = parseInt(match[1]);
              }
            }
          }

          // Only add correction if it's needed and has valid coordinates
          if (
            correction.needs_correction === "yes" &&
            !isNaN(correction.new_bbox_x) &&
            !isNaN(correction.new_bbox_y)
          ) {
            corrections.push(correction);
          }
        });
      }
    }

    return corrections;
  }

  parseAssessmentSection(analysisXML) {
    const assessmentMatch = analysisXML.match(
      /<assessment>([\s\S]*?)<\/assessment>/
    );
    let confidence = 50;
    let overallAccuracy = 50;

    if (assessmentMatch) {
      const assessmentXML = assessmentMatch[1];
      const confidenceMatch = assessmentXML.match(
        /<confidence>(\d+)<\/confidence>/
      );
      const accuracyMatch = assessmentXML.match(/<accuracy>(\d+)<\/accuracy>/);

      if (confidenceMatch) {
        confidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[1])));
      }
      if (accuracyMatch) {
        overallAccuracy = Math.min(
          100,
          Math.max(0, parseInt(accuracyMatch[1]))
        );
      }
    }

    return { confidence, overallAccuracy };
  }
}
