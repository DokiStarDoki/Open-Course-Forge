// AlignmentAnalyzer.js - Simplified alignment checking using simple prompts
class AlignmentAnalyzer {
  constructor(detector) {
    this.detector = detector;
  }

  // Simple alignment check - one attempt only, no retries
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

      const overlayResponse = await fetch(overlayImageUrl);
      const overlayBlob = await overlayResponse.blob();
      const overlayFile = new File(
        [overlayBlob],
        `alignment_check_${buttonNumber}.png`,
        { type: "image/png" }
      );

      const base64DataURL = await this.detector.fileToBase64DataURL(
        overlayFile
      );
      const alignmentPrompt = this.buildSimpleAlignmentPrompt(button);

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
        max_tokens: 500,
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

      const parsed = this.parseSimpleAlignmentResponse(
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
        `📋 Button ${buttonNumber} alignment result: ${parsed.response_type}, Success: ${parsed.parsing_successful}`
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

  // Very simple alignment prompt - no complex instructions
  buildSimpleAlignmentPrompt(button) {
    return `Look at the red bounding box labeled "${button.reference_name}" in this image.

Does this red box perfectly align with the "${button.reference_name}" button?

Answer in this exact format:

<alignment>
<aligned>yes</aligned>
<overlapping>yes</overlapping>
<direction>none</direction>
</alignment>

Rules:
- aligned: "yes" if the box perfectly covers the button, "no" if it needs to move
- overlapping: "yes" if any part of the box touches the button, "no" if completely separate
- direction: if not aligned, say "up", "down", "left", or "right" to move the box. If aligned, say "none"

Only respond with the XML above, nothing else.`;
  }

  // Simple parsing - just extract the three values, no complex fallbacks
  parseSimpleAlignmentResponse(content, button, buttonNumber) {
    console.log(`📋 Parsing alignment response for button ${buttonNumber}`);

    try {
      // Extract values using regex
      const alignedMatch = content.match(/<aligned>(.*?)<\/aligned>/);
      const overlappingMatch = content.match(
        /<overlapping>(.*?)<\/overlapping>/
      );
      const directionMatch = content.match(/<direction>(.*?)<\/direction>/);

      const isAligned = alignedMatch
        ? alignedMatch[1].trim().toLowerCase() === "yes"
        : false;
      const overlapping = overlappingMatch
        ? overlappingMatch[1].trim().toLowerCase() === "yes"
        : true;
      const direction = directionMatch
        ? directionMatch[1].trim().toLowerCase()
        : "none";

      const needsMovement = !isAligned && direction !== "none";

      console.log(
        `📊 Button ${buttonNumber} alignment: aligned=${isAligned}, overlapping=${overlapping}, direction=${direction}`
      );

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
          },
        });
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
