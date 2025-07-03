// AlignmentAnalyzer.js - Direct alignment checking using simple prompts
class AlignmentAnalyzer {
  constructor(detector) {
    this.detector = detector;
  }

  // Main method to analyze single button alignment
  async analyzeSingleButtonAlignment(
    overlayImageUrl,
    button,
    buttonNumber,
    cycleNumber,
    maxRetries = 2
  ) {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(
          `🎯 Direct alignment check - Button ${buttonNumber} (${button.reference_name}), Cycle ${cycleNumber}, Attempt ${attempt}`
        );

        const overlayResponse = await fetch(overlayImageUrl);
        const overlayBlob = await overlayResponse.blob();
        const overlayFile = new File(
          [overlayBlob],
          `alignment_check_${buttonNumber}_cycle_${cycleNumber}_attempt_${attempt}.png`,
          { type: "image/png" }
        );

        const base64DataURL = await this.detector.fileToBase64DataURL(
          overlayFile
        );
        const alignmentPrompt = this.buildDirectAlignmentPrompt(
          button,
          buttonNumber,
          attempt
        );

        // Log the LLM conversation request
        if (typeof debugLogger !== "undefined") {
          debugLogger.addLLMConversation(
            "direct_alignment_check",
            { name: button.reference_name, index: buttonNumber },
            {
              prompt: alignmentPrompt,
              imageUrl: overlayImageUrl,
              model: "gpt-4o",
              attempt: attempt,
            },
            {}, // Response will be filled in after API call
            {
              cycle: cycleNumber,
              buttonIndex: buttonNumber,
              analysisType: "DIRECT_ALIGNMENT_CHECK",
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
                  text: alignmentPrompt,
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
          max_tokens: 1000,
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

        const parsed = this.parseDirectAlignmentResponse(
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
          `📋 Button ${buttonNumber} alignment result: ${parsed.response_type}, Success: ${parsed.parsing_successful}`
        );

        if (parsed.parsing_successful || attempt === maxRetries + 1) {
          return parsed;
        }

        console.log(
          `⚠️ Button ${buttonNumber} alignment attempt ${attempt} failed, retrying...`
        );
      } catch (error) {
        console.error(`❌ Error in alignment check attempt ${attempt}:`, error);
        if (attempt === maxRetries + 1) {
          return {
            corrections: [],
            confidence: 25,
            overallAccuracy: 25,
            parsing_successful: false,
            response_type: "alignment_error",
            raw_response: error.message,
            buttonAnalyses: [],
          };
        }
      }
    }
  }

  // Direct alignment prompt - based on the successful manual test
  buildDirectAlignmentPrompt(button, buttonNumber, attemptNumber) {
    const basePrompt = `🎯 BUTTON ALIGNMENT VERIFICATION

I'm showing you an image where I've highlighted a button with a red bounding box and label.

BUTTON TO ANALYZE: "${button.reference_name}"

SIMPLE ALIGNMENT QUESTION:
Does the button "${button.reference_name}" line up with the red bounding box labeled "${button.reference_name}"?

Look at the image and tell me:
1. Does the red bounding box cover the actual "${button.reference_name}" button properly?
2. If not, how should the bounding box be moved to line up better?

RESPOND in this XML format:

<alignment_check>
<button_name>${button.reference_name}</button_name>
<box_aligns_with_button>yes</box_aligns_with_button>
<alignment_quality>good</alignment_quality>
<needs_adjustment>no</needs_adjustment>
<adjustment_direction>none</adjustment_direction>
<suggested_shift>none</suggested_shift>
<new_bbox_x>0</new_bbox_x>
<new_bbox_y>0</new_bbox_y>
<new_bbox_width>0</new_bbox_width>
<new_bbox_height>0</new_bbox_height>
<confidence>95</confidence>
<notes>Button and bounding box align well</notes>
</alignment_check>

INSTRUCTIONS:
- box_aligns_with_button: "yes" or "no"
- alignment_quality: "excellent", "good", "poor", or "terrible"
- needs_adjustment: "yes" or "no"
- adjustment_direction: "up", "down", "left", "right", "up-left", "up-right", "down-left", "down-right", or "none"
- suggested_shift: describe in plain English like "shift down and to the left"
- If needs_adjustment is "yes", provide new_bbox_x, new_bbox_y, new_bbox_width, new_bbox_height coordinates
- confidence: 0-100 (how confident you are in this assessment)
- notes: brief explanation of what you see`;

    if (attemptNumber > 1) {
      return (
        basePrompt +
        `\n\n⚠️ RETRY ATTEMPT ${attemptNumber} - Please be more specific about the alignment between the button "${button.reference_name}" and its red bounding box.`
      );
    }

    return basePrompt;
  }

  // Parse the direct alignment response with flexible, non-strict patterns
  parseDirectAlignmentResponse(content, button, buttonNumber) {
    try {
      console.log(
        `🔍 Parsing direct alignment response for button ${buttonNumber} with flexible patterns`
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
      let alignmentData = null;
      let parseMethod = "unknown";

      // Strategy 1: Strict XML parsing
      alignmentData = this.parseAlignmentXMLStrict(content);
      if (alignmentData) {
        parseMethod = "strict_xml";
        console.log(`✅ Button ${buttonNumber}: Parsed with strict XML`);
      }

      // Strategy 2: Flexible XML parsing (allow extra whitespace, different formatting)
      if (!alignmentData) {
        alignmentData = this.parseAlignmentXMLFlexible(content);
        if (alignmentData) {
          parseMethod = "flexible_xml";
          console.log(`✅ Button ${buttonNumber}: Parsed with flexible XML`);
        }
      }

      // Strategy 3: Individual field extraction (no XML structure required)
      if (!alignmentData) {
        alignmentData = this.parseAlignmentFieldsLoose(content);
        if (alignmentData) {
          parseMethod = "loose_fields";
          console.log(
            `✅ Button ${buttonNumber}: Parsed with loose field extraction`
          );
        }
      }

      // Strategy 4: Pattern-based extraction (look for key phrases)
      if (!alignmentData) {
        alignmentData = this.parseAlignmentPatterns(content);
        if (alignmentData) {
          parseMethod = "pattern_based";
          console.log(
            `✅ Button ${buttonNumber}: Parsed with pattern matching`
          );
        }
      }

      if (!alignmentData) {
        console.log(
          `⚠️ All parsing strategies failed for button ${buttonNumber}`
        );
        return {
          buttonAnalyses: [],
          corrections: [],
          confidence: 20,
          overallAccuracy: 20,
          parsing_successful: false,
          response_type: "no_parseable_data",
          raw_response: content,
          parse_attempts: [
            "strict_xml",
            "flexible_xml",
            "loose_fields",
            "pattern_based",
          ],
        };
      }

      // Create corrections if adjustment is needed
      const corrections = this.createCorrectionsFromAlignment(
        alignmentData,
        button,
        buttonNumber
      );

      // Create button analysis
      const buttonAnalyses = this.createButtonAnalysisFromAlignment(
        alignmentData,
        button,
        buttonNumber
      );

      const confidence = alignmentData.confidence || 50;
      const overallAccuracy = confidence;

      const parsing_successful =
        alignmentData.box_aligns_with_button !== undefined;

      console.log(
        `📊 Button ${buttonNumber} flexible alignment parsing: ${
          parsing_successful ? "SUCCESS" : "FAILED"
        } (${parseMethod}), Alignment: ${
          alignmentData.box_aligns_with_button
        }, Needs adjustment: ${alignmentData.needs_adjustment}`
      );

      return {
        buttonAnalyses,
        corrections,
        confidence,
        overallAccuracy,
        parsing_successful,
        response_type: `direct_alignment_${parseMethod}`,
        raw_response: content,
        direct_alignment_analysis: true,
        parse_method: parseMethod,
        alignment_summary: {
          aligns: alignmentData.box_aligns_with_button === "yes",
          quality: alignmentData.alignment_quality,
          needs_adjustment: alignmentData.needs_adjustment === "yes",
          suggested_shift: alignmentData.suggested_shift,
        },
      };
    } catch (error) {
      console.error(
        `❌ Error parsing direct alignment response for button ${buttonNumber}:`,
        error
      );
      return {
        buttonAnalyses: [],
        corrections: [],
        confidence: 25,
        overallAccuracy: 25,
        parsing_successful: false,
        response_type: "alignment_parsing_error",
        raw_response: content,
        error: error.message,
      };
    }
  }

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

  // Strategy 1: Strict XML parsing (original method)
  parseAlignmentXMLStrict(content) {
    const alignmentMatch = content.match(
      /<alignment_check>([\s\S]*?)<\/alignment_check>/
    );
    if (!alignmentMatch) return null;

    return this.parseAlignmentFields(alignmentMatch[1]);
  }

  // Strategy 2: Flexible XML parsing (handle formatting variations)
  parseAlignmentXMLFlexible(content) {
    // More flexible regex that handles extra whitespace and line breaks
    const flexibleMatch = content.match(
      /<alignment_check\s*>([\s\S]*?)<\/\s*alignment_check\s*>/i
    );
    if (!flexibleMatch) {
      // Try without namespace or with different tag variations
      const altMatch = content.match(
        /<alignment[^>]*>([\s\S]*?)<\/\s*alignment[^>]*>/i
      );
      if (!altMatch) return null;
      return this.parseAlignmentFieldsFlexible(altMatch[1]);
    }

    return this.parseAlignmentFieldsFlexible(flexibleMatch[1]);
  }

  // Strategy 3: Loose field extraction (no XML structure required)
  parseAlignmentFieldsLoose(content) {
    const alignmentData = {};

    // Extract fields using more flexible patterns that work without XML tags
    const fieldPatterns = {
      button_name: [
        /button[_\s]*name[:\s]*["\']?([^"\'\n\r<>]+)["\']?/i,
        /analyzing[:\s]*["\']?([^"\'\n\r<>]+)["\']?/i,
      ],
      box_aligns_with_button: [
        /box[_\s]*aligns[^:]*:[:\s]*([yn][eo][s]?)/i,
        /aligns?[^:]*:[:\s]*([yn][eo][s]?)/i,
        /bounding box.*?(aligns?|lines? up|matches).*?(yes|no)/i,
        /the.*?box.*?(does|doesn't|does not).*?(align|line up|match)/i,
      ],
      alignment_quality: [
        /alignment[_\s]*quality[:\s]*([a-z]+)/i,
        /quality[:\s]*([a-z]+)/i,
        /(excellent|good|poor|terrible)/i,
      ],
      needs_adjustment: [
        /needs[_\s]*adjustment[:\s]*([yn][eo][s]?)/i,
        /adjustment.*?needed[:\s]*([yn][eo][s]?)/i,
        /should.*?(adjust|move|shift)/i,
      ],
      adjustment_direction: [
        /adjustment[_\s]*direction[:\s]*([a-z\-]+)/i,
        /direction[:\s]*([a-z\-]+)/i,
        /(up|down|left|right|north|south|east|west)[\-]?(up|down|left|right)?/i,
      ],
      suggested_shift: [
        /suggested[_\s]*shift[:\s]*([^<>\n\r]+)/i,
        /shift[:\s]*([^<>\n\r]+)/i,
        /move.*?(up|down|left|right|north|south|east|west)/i,
      ],
      confidence: [/confidence[:\s]*(\d+)/i, /(\d+)%?\s*confident/i],
      new_bbox_x: [
        /new[_\s]*bbox[_\s]*x[:\s]*(\d+)/i,
        /x[_\s]*coordinate[:\s]*(\d+)/i,
      ],
      new_bbox_y: [
        /new[_\s]*bbox[_\s]*y[:\s]*(\d+)/i,
        /y[_\s]*coordinate[:\s]*(\d+)/i,
      ],
    };

    // Try each pattern for each field
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          if (field === "confidence" || field.includes("bbox")) {
            alignmentData[field] = parseInt(match[1]) || 0;
          } else {
            alignmentData[field] = match[1].trim().toLowerCase();
          }
          break; // Found a match, move to next field
        }
      }
    }

    // Return data if we found at least the essential fields
    if (alignmentData.box_aligns_with_button) {
      return alignmentData;
    }

    return null;
  }

  // Strategy 4: Pattern-based extraction (look for key phrases and intent)
  parseAlignmentPatterns(content) {
    const alignmentData = {};
    const lowercaseContent = content.toLowerCase();

    // Pattern matching for alignment status
    if (
      lowercaseContent.includes("does not align") ||
      lowercaseContent.includes("doesn't align") ||
      lowercaseContent.includes("not aligned") ||
      lowercaseContent.includes("misaligned") ||
      lowercaseContent.includes("off") ||
      lowercaseContent.includes("needs to move") ||
      lowercaseContent.includes("should be moved")
    ) {
      alignmentData.box_aligns_with_button = "no";
      alignmentData.needs_adjustment = "yes";
    } else if (
      lowercaseContent.includes("aligns") ||
      lowercaseContent.includes("aligned") ||
      lowercaseContent.includes("lines up") ||
      lowercaseContent.includes("matches") ||
      lowercaseContent.includes("correctly positioned")
    ) {
      alignmentData.box_aligns_with_button = "yes";
      alignmentData.needs_adjustment = "no";
    }

    // Pattern matching for quality assessment
    if (lowercaseContent.includes("excellent")) {
      alignmentData.alignment_quality = "excellent";
    } else if (lowercaseContent.includes("good")) {
      alignmentData.alignment_quality = "good";
    } else if (lowercaseContent.includes("poor")) {
      alignmentData.alignment_quality = "poor";
    } else if (
      lowercaseContent.includes("terrible") ||
      lowercaseContent.includes("bad")
    ) {
      alignmentData.alignment_quality = "terrible";
    }

    // Pattern matching for direction
    const directionPatterns = [
      { pattern: /move.*?(up|north)/i, direction: "up" },
      { pattern: /move.*?(down|south)/i, direction: "down" },
      { pattern: /move.*?(left|west)/i, direction: "left" },
      { pattern: /move.*?(right|east)/i, direction: "right" },
      { pattern: /shift.*?(up|north)/i, direction: "up" },
      { pattern: /shift.*?(down|south)/i, direction: "down" },
      { pattern: /shift.*?(left|west)/i, direction: "left" },
      { pattern: /shift.*?(right|east)/i, direction: "right" },
      { pattern: /(up|north).*?(left|west)/i, direction: "up-left" },
      { pattern: /(up|north).*?(right|east)/i, direction: "up-right" },
      { pattern: /(down|south).*?(left|west)/i, direction: "down-left" },
      { pattern: /(down|south).*?(right|east)/i, direction: "down-right" },
    ];

    for (const { pattern, direction } of directionPatterns) {
      if (pattern.test(content)) {
        alignmentData.adjustment_direction = direction;
        alignmentData.suggested_shift = `shift ${direction}`;
        break;
      }
    }

    // Pattern matching for confidence
    const confidenceMatch = content.match(
      /(\d+)%?\s*(confident|confidence|sure|certain)/i
    );
    if (confidenceMatch) {
      alignmentData.confidence = parseInt(confidenceMatch[1]);
    }

    // Set button name if available
    alignmentData.button_name = button?.reference_name || "unknown";

    // Return data if we found essential information
    if (alignmentData.box_aligns_with_button) {
      return alignmentData;
    }

    return null;
  }

  // Flexible field parsing for XML content with variations
  parseAlignmentFieldsFlexible(alignmentXML) {
    const fields = {
      button_name: [
        /<button[_\s]*name\s*>(.*?)<\/button[_\s]*name\s*>/i,
        /<name\s*>(.*?)<\/name\s*>/i,
      ],
      box_aligns_with_button: [
        /<box[_\s]*aligns[_\s]*with[_\s]*button\s*>(.*?)<\/box[_\s]*aligns[_\s]*with[_\s]*button\s*>/i,
        /<aligns\s*>(.*?)<\/aligns\s*>/i,
        /<alignment\s*>(.*?)<\/alignment\s*>/i,
      ],
      alignment_quality: [
        /<alignment[_\s]*quality\s*>(.*?)<\/alignment[_\s]*quality\s*>/i,
        /<quality\s*>(.*?)<\/quality\s*>/i,
      ],
      needs_adjustment: [
        /<needs[_\s]*adjustment\s*>(.*?)<\/needs[_\s]*adjustment\s*>/i,
        /<adjustment[_\s]*needed\s*>(.*?)<\/adjustment[_\s]*needed\s*>/i,
        /<needs[_\s]*correction\s*>(.*?)<\/needs[_\s]*correction\s*>/i,
      ],
      adjustment_direction: [
        /<adjustment[_\s]*direction\s*>(.*?)<\/adjustment[_\s]*direction\s*>/i,
        /<direction\s*>(.*?)<\/direction\s*>/i,
        /<move[_\s]*direction\s*>(.*?)<\/move[_\s]*direction\s*>/i,
      ],
      suggested_shift: [
        /<suggested[_\s]*shift\s*>(.*?)<\/suggested[_\s]*shift\s*>/i,
        /<shift\s*>(.*?)<\/shift\s*>/i,
      ],
      new_bbox_x: [
        /<new[_\s]*bbox[_\s]*x\s*>(\d+)<\/new[_\s]*bbox[_\s]*x\s*>/i,
        /<x\s*>(\d+)<\/x\s*>/i,
      ],
      new_bbox_y: [
        /<new[_\s]*bbox[_\s]*y\s*>(\d+)<\/new[_\s]*bbox[_\s]*y\s*>/i,
        /<y\s*>(\d+)<\/y\s*>/i,
      ],
      new_bbox_width: [
        /<new[_\s]*bbox[_\s]*width\s*>(\d+)<\/new[_\s]*bbox[_\s]*width\s*>/i,
        /<width\s*>(\d+)<\/width\s*>/i,
      ],
      new_bbox_height: [
        /<new[_\s]*bbox[_\s]*height\s*>(\d+)<\/new[_\s]*bbox[_\s]*height\s*>/i,
        /<height\s*>(\d+)<\/height\s*>/i,
      ],
      confidence: [
        /<confidence\s*>(\d+)<\/confidence\s*>/i,
        /<confidence[_\s]*level\s*>(\d+)<\/confidence[_\s]*level\s*>/i,
      ],
      notes: [
        /<notes\s*>(.*?)<\/notes\s*>/i,
        /<comment\s*>(.*?)<\/comment\s*>/i,
        /<description\s*>(.*?)<\/description\s*>/i,
      ],
    };

    const alignmentData = {};

    // Try multiple patterns for each field
    for (const [key, patterns] of Object.entries(fields)) {
      for (const pattern of patterns) {
        const match = alignmentXML.match(pattern);
        if (match && match[1]) {
          if (
            key === "new_bbox_x" ||
            key === "new_bbox_y" ||
            key === "new_bbox_width" ||
            key === "new_bbox_height" ||
            key === "confidence"
          ) {
            alignmentData[key] = parseInt(match[1]) || 0;
          } else {
            alignmentData[key] = match[1].trim();
          }
          break; // Found a match, move to next field
        }
      }
    }

    return Object.keys(alignmentData).length > 0 ? alignmentData : null;
  }

  // Helper method to create corrections from alignment data
  createCorrectionsFromAlignment(alignmentData, button, buttonNumber) {
    const corrections = [];

    if (
      alignmentData.needs_adjustment === "yes" &&
      alignmentData.new_bbox_x > 0 &&
      alignmentData.new_bbox_y > 0
    ) {
      corrections.push({
        button_number: buttonNumber,
        needs_correction: "yes",
        correction_type: "alignment_adjustment",
        move_direction: alignmentData.adjustment_direction || "unknown",
        new_bbox_x: alignmentData.new_bbox_x,
        new_bbox_y: alignmentData.new_bbox_y,
        new_bbox_width:
          alignmentData.new_bbox_width || button.bounding_box.width,
        new_bbox_height:
          alignmentData.new_bbox_height || button.bounding_box.height,
        suggested_shift: alignmentData.suggested_shift || "none",
        alignment_analysis: {
          box_aligns_with_button:
            alignmentData.box_aligns_with_button === "yes",
          alignment_quality: alignmentData.alignment_quality || "unknown",
          needs_adjustment: true,
          adjustment_direction: alignmentData.adjustment_direction || "unknown",
          direct_alignment_check: true,
        },
      });
    }

    return corrections;
  }

  // Helper method to create button analysis from alignment data
  createButtonAnalysisFromAlignment(alignmentData, button, buttonNumber) {
    return [
      {
        button_number: buttonNumber,
        button_name: alignmentData.button_name || button.reference_name,
        box_aligns_with_button: alignmentData.box_aligns_with_button === "yes",
        alignment_quality: alignmentData.alignment_quality || "unknown",
        needs_adjustment: alignmentData.needs_adjustment === "yes",
        adjustment_direction: alignmentData.adjustment_direction || "none",
        suggested_shift: alignmentData.suggested_shift || "none",
        direct_alignment_analysis: true,
        alignment_notes: alignmentData.notes || "No notes provided",
      },
    ];
  }
}
