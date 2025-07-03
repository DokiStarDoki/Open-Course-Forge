// AlignmentAnalyzer.js - Improved alignment checking with better prompts and detailed logging
class AlignmentAnalyzer {
  constructor(detector) {
    this.detector = detector;
  }

  // Simple alignment check with enhanced logging and debugging
  async analyzeSingleButtonAlignment(
    overlayImageUrl,
    button,
    buttonNumber,
    cycleNumber
  ) {
    try {
      console.log(
        `🎯 Checking alignment for button ${buttonNumber}: ${button.reference_name}`
      );
      console.log(`📦 Current bounding box:`, button.bounding_box);

      const overlayResponse = await fetch(overlayImageUrl);
      const overlayBlob = await overlayResponse.blob();
      const overlayFile = new File(
        [overlayBlob],
        `alignment_check_${buttonNumber}_cycle_${cycleNumber}.png`,
        { type: "image/png" }
      );

      const base64DataURL = await this.detector.fileToBase64DataURL(
        overlayFile
      );
      const alignmentPrompt = this.buildClearAlignmentPrompt(button);

      console.log(`📝 Sending alignment prompt for button ${buttonNumber}`);

      // Log the LLM conversation request
      if (typeof debugLogger !== "undefined") {
        debugLogger.addLLMConversation(
          "simple_alignment_check",
          { name: button.reference_name, index: buttonNumber },
          {
            prompt: alignmentPrompt,
            imageUrl: overlayImageUrl,
            model: "gpt-4o",
            attempt: 1,
          },
          {}, // Response will be filled in after API call
          {
            cycle: cycleNumber,
            buttonIndex: buttonNumber,
            analysisType: "SIMPLE_ALIGNMENT_CHECK",
            currentBoundingBox: button.bounding_box,
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
        max_tokens: 300,
        temperature: 0.0, // Most deterministic
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
        `🤖 Raw LLM response for button ${buttonNumber}:`,
        JSON.stringify(content)
      );

      const parsed = this.parseAlignmentResponseWithLogging(
        content,
        button,
        buttonNumber
      );

      // Update the LLM conversation with the response
      if (typeof debugLogger !== "undefined") {
        const lastConversation =
          debugLogger.llmConversations[debugLogger.llmConversations.length - 1];
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
        `📋 Button ${buttonNumber} alignment result: aligned=${parsed.isAligned}, direction=${parsed.direction}, success=${parsed.parsing_successful}`
      );

      return parsed;
    } catch (error) {
      console.error(
        `❌ Error checking alignment for button ${buttonNumber}:`,
        error
      );
      return {
        corrections: [],
        confidence: 50,
        overallAccuracy: 50,
        parsing_successful: false,
        response_type: "alignment_error",
        raw_response: error.message,
        buttonAnalyses: [],
        isAligned: true, // Default to aligned if error
        needsMovement: false,
        direction: "none",
        overlapping: true,
      };
    }
  }

  // Very clear alignment prompt with explicit formatting instructions
  buildClearAlignmentPrompt(button) {
    return `You are analyzing a screenshot with a red bounding box around a button.

TASK: Does the red box perfectly align with the "${button.reference_name}" button?

LOOK FOR:
- The red bounding box labeled "${button.reference_name}"
- The actual "${button.reference_name}" button in the image
- Whether they line up perfectly

RESPOND WITH EXACTLY THIS XML FORMAT:

<alignment>
<aligned>yes</aligned>
<overlapping>yes</overlapping>
<direction>none</direction>
</alignment>

FILL IN THE VALUES:
- aligned: "yes" if red box perfectly covers the button, "no" if it needs to move
- overlapping: "yes" if red box touches any part of the button, "no" if completely separate  
- direction: if not aligned, pick ONE: "up", "down", "left", "right". If aligned, use "none"

CRITICAL RULES:
- Respond ONLY with the XML above
- NO markdown formatting like \`\`\`xml
- NO explanations before or after
- NO other text

Look at the red box and the "${button.reference_name}" button. Are they aligned?`;
  }

  // Enhanced parsing with extensive logging and multiple fallback strategies
  parseAlignmentResponseWithLogging(content, button, buttonNumber) {
    console.log(
      `🔍 Starting to parse alignment response for button ${buttonNumber}`
    );
    console.log(
      `📝 Raw content (${content.length} chars):`,
      JSON.stringify(content)
    );

    try {
      // Clean the content
      let cleanContent = content.trim();
      console.log(
        `🧹 After trim (${cleanContent.length} chars):`,
        JSON.stringify(cleanContent)
      );

      // Remove any markdown formatting
      cleanContent = cleanContent
        .replace(/```xml\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      console.log(`🧹 After removing markdown:`, JSON.stringify(cleanContent));

      let isAligned = false;
      let overlapping = true;
      let direction = "none";
      let parseMethod = "unknown";

      // Strategy 1: Try standard XML parsing first
      console.log(`🔬 Attempting Strategy 1: Standard XML parsing`);
      const alignedMatch = cleanContent.match(/<aligned>(.*?)<\/aligned>/i);
      const overlappingMatch = cleanContent.match(
        /<overlapping>(.*?)<\/overlapping>/i
      );
      const directionMatch = cleanContent.match(
        /<direction>(.*?)<\/direction>/i
      );

      if (alignedMatch && overlappingMatch && directionMatch) {
        isAligned = alignedMatch[1].trim().toLowerCase() === "yes";
        overlapping = overlappingMatch[1].trim().toLowerCase() === "yes";
        direction = directionMatch[1].trim().toLowerCase();
        parseMethod = "standard_xml";
        console.log(
          `✅ Strategy 1 successful: aligned=${isAligned}, overlapping=${overlapping}, direction=${direction}`
        );
      } else {
        console.log(`❌ Strategy 1 failed. Matches found:`, {
          alignedMatch,
          overlappingMatch,
          directionMatch,
        });

        // Strategy 2: Try parsing space-separated values
        console.log(`🔬 Attempting Strategy 2: Space-separated parsing`);
        const words = cleanContent
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 0);
        console.log(`📝 Words found:`, words);

        // Look for yes/no patterns and direction words
        const yesWords = words.filter((w) => w === "yes").length;
        const noWords = words.filter((w) => w === "no").length;
        const directionWords = words.filter((w) =>
          ["up", "down", "left", "right", "none"].includes(w)
        );

        console.log(
          `📊 Pattern analysis: ${yesWords} yes, ${noWords} no, directions: ${directionWords}`
        );

        if (words.length >= 3 && directionWords.length > 0) {
          // Assume format: aligned overlapping direction
          const possibleAligned = words.find((w) => w === "yes" || w === "no");
          direction = directionWords[0] || "none";

          if (possibleAligned === "yes" && direction === "none") {
            isAligned = true;
          } else {
            isAligned = false;
          }

          overlapping = yesWords > 0; // If any yes found, assume overlapping
          parseMethod = "space_separated";
          console.log(
            `✅ Strategy 2 successful: aligned=${isAligned}, overlapping=${overlapping}, direction=${direction}`
          );
        } else {
          console.log(
            `❌ Strategy 2 failed. Insufficient words or no directions found.`
          );

          // Strategy 3: Keyword-based analysis
          console.log(`🔬 Attempting Strategy 3: Keyword analysis`);
          const lowerContent = cleanContent.toLowerCase();

          // Look for alignment indicators
          if (
            lowerContent.includes("perfectly") ||
            lowerContent.includes("aligned") ||
            lowerContent.includes("correct") ||
            lowerContent.includes("good")
          ) {
            isAligned = true;
            direction = "none";
          } else {
            isAligned = false;
            // Look for direction keywords
            if (lowerContent.includes("up")) direction = "up";
            else if (lowerContent.includes("down")) direction = "down";
            else if (lowerContent.includes("left")) direction = "left";
            else if (lowerContent.includes("right")) direction = "right";
            else direction = "down"; // Default fallback
          }

          overlapping =
            !lowerContent.includes("separate") &&
            !lowerContent.includes("no overlap");
          parseMethod = "keyword_analysis";
          console.log(
            `✅ Strategy 3 result: aligned=${isAligned}, overlapping=${overlapping}, direction=${direction}`
          );
        }
      }

      const needsMovement = !isAligned && direction !== "none";

      console.log(`📊 Final parsed result for button ${buttonNumber}:`);
      console.log(`   - Aligned: ${isAligned}`);
      console.log(`   - Overlapping: ${overlapping}`);
      console.log(`   - Direction: ${direction}`);
      console.log(`   - Needs movement: ${needsMovement}`);
      console.log(`   - Parse method: ${parseMethod}`);

      // Create corrections if movement needed
      const corrections = [];
      if (needsMovement) {
        corrections.push({
          button_number: buttonNumber,
          needs_correction: "yes",
          correction_type: "simple_alignment",
          move_direction: direction,
          alignment_analysis: {
            box_aligns_with_button: isAligned,
            overlapping: overlapping,
            needs_adjustment: true,
            adjustment_direction: direction,
            parse_method: parseMethod,
          },
        });
        console.log(`📝 Created correction: move ${direction}`);
      }

      // Create button analysis
      const buttonAnalyses = [
        {
          button_number: buttonNumber,
          button_name: button.reference_name,
          box_aligns_with_button: isAligned,
          overlapping: overlapping,
          needs_adjustment: needsMovement,
          adjustment_direction: direction,
          simple_alignment_analysis: true,
          parse_method: parseMethod,
          raw_response_preview: content.substring(0, 100),
        },
      ];

      return {
        buttonAnalyses,
        corrections,
        confidence: isAligned ? 90 : 70,
        overallAccuracy: isAligned ? 90 : 70,
        parsing_successful: true,
        response_type: "simple_alignment",
        raw_response: content,
        isAligned,
        needsMovement,
        direction,
        overlapping,
        parse_method: parseMethod,
      };
    } catch (error) {
      console.error(
        `❌ Error parsing alignment response for button ${buttonNumber}:`,
        error
      );
      return {
        buttonAnalyses: [],
        corrections: [],
        confidence: 50,
        overallAccuracy: 50,
        parsing_successful: false,
        response_type: "alignment_parsing_error",
        raw_response: content,
        error: error.message,
        isAligned: true, // Default to aligned if parsing fails
        needsMovement: false,
        direction: "none",
        overlapping: true,
      };
    }
  }
}
