// GPT-4 Vision Button Detector Application
// Main application logic - FIXED VERSION

class GPT4VisionButtonDetector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    };
    this.apiCallCount = 0;
  }

  async loadPrompt() {
    try {
      const response = await fetch("./prompt.txt");
      if (!response.ok) {
        throw new Error(
          `Failed to load prompt.txt: ${response.status} ${response.statusText}. Make sure prompt.txt exists in the same folder as index.html`
        );
      }
      return await response.text();
    } catch (error) {
      console.error("Error loading prompt:", error);
      throw error;
    }
  }

  async fileToBase64DataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async analyzeImageForButtons(imageFile) {
    try {
      const base64DataURL = await this.fileToBase64DataURL(imageFile);
      const promptText = await this.loadPrompt();

      const requestBody = {
        model: "gpt-4o", // Updated to current model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText,
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

      console.log("Sending request to GPT-4 Vision API...");
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: this.headers,
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
      console.log("GPT-4V API response:", result);

      const content = result.choices[0].message.content;
      console.log("Raw GPT-4V response content:", content);

      // Parse using XML tags instead of JSON to handle LLM inconsistencies
      const analysisResult = this.parseAnalysisFromXML(content);

      if (debugMode) {
        this.addDebugLog("api-response", "Raw GPT-4V Response", {
          rawContent: content,
          parsedResult: analysisResult,
        });
      }

      // FIX: Actually return the analysis result
      return analysisResult;
    } catch (error) {
      console.error("Error in analyzeImageForButtons:", error);
      throw error;
    }
  }

  // CONTEXTUAL ANALYSIS METHOD: Analyze with context about what we're searching for
  async analyzeImageForButtonsWithContext(imageFile, targetButton) {
    try {
      const base64DataURL = await this.fileToBase64DataURL(imageFile);
      const basePrompt = await this.loadPrompt();

      // Add context about what we're specifically looking for
      const contextualPrompt =
        basePrompt +
        `\n\nSPECIFIC SEARCH CONTEXT:\nI am specifically looking for a button/element called "${targetButton.reference_name}" that was described as: "${targetButton.description}". This element should be of type "${targetButton.element_type}" and was detected with ${targetButton.confidence}% confidence. Please focus on finding this specific element in this cropped image section.`;

      const requestBody = {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: contextualPrompt,
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

      console.log("Sending contextual request to GPT-4 Vision API...");
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: this.headers,
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

      // Parse using XML tags
      const analysisResult = this.parseAnalysisFromXML(content);

      if (debugMode) {
        this.addDebugLog("contextual-analysis", "Contextual Analysis Result", {
          targetButton: targetButton.reference_name,
          rawContent: content,
          parsedResult: analysisResult,
        });
      }

      return analysisResult;
    } catch (error) {
      console.error("Error in contextual analysis:", error);
      throw error;
    }
  }

  // Progressive slicing analysis - the main new feature
  async analyzeWithProgressiveSlicing(originalFile, imageDimensions) {
    console.log("Starting progressive slicing analysis...");
    this.apiCallCount = 1; // Count initial analysis

    // Initialize debug logging
    if (debugMode) {
      debugLog = [];
      sliceVisualizations = [];
      this.addDebugLog("info", "Progressive Slicing Started", {
        imageDimensions,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Step 1: Initial full image analysis
      const initialAnalysis = await this.analyzeImageForButtons(originalFile);

      if (debugMode) {
        this.addDebugLog("api-call", "Initial Full Image Analysis", {
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
        "Initial analysis found " +
          initialAnalysis.detected_buttons.length +
          " buttons"
      );

      // Step 2: Start recursive slicing
      const refinedButtons = await this.recursiveSlicing(
        originalFile,
        initialAnalysis.detected_buttons,
        imageDimensions,
        [],
        0
      );

      if (debugMode) {
        this.addDebugLog("success", "Progressive Slicing Completed", {
          totalApiCalls: this.apiCallCount,
          finalButtonCount: refinedButtons.length,
          slicesCreated: sliceVisualizations.length,
        });
        updateDebugPanel();
      }

      return Object.assign({}, initialAnalysis, {
        detected_buttons: refinedButtons,
        analysis_method: "progressive_slicing",
        total_api_calls: this.apiCallCount,
        debug_log: debugMode ? debugLog : undefined,
        slice_visualizations: debugMode ? sliceVisualizations : undefined,
      });
    } catch (error) {
      if (debugMode) {
        this.addDebugLog("error", "Progressive Slicing Failed", {
          error: error.message,
          apiCallsUsed: this.apiCallCount,
        });
        if (typeof updateDebugPanel === "function") {
          updateDebugPanel();
        }
      }
      console.error("Error in progressive slicing:", error);
      throw error;
    }
  }

  async recursiveSlicing(
    imageFile,
    buttons,
    imageDimensions,
    transformHistory,
    depth
  ) {
    console.log(
      "Slicing depth " + depth + ", analyzing " + buttons.length + " buttons"
    );

    if (debugMode) {
      this.addDebugLog("slice", `Recursive Slicing - Depth ${depth}`, {
        depth,
        buttonsToProcess: buttons.length,
        imageDimensions,
        transformHistory,
      });
    }

    try {
      // Check stopping conditions - cap at depth 2
      if (depth >= 2) {
        console.log("Maximum depth reached: " + depth);

        if (debugMode) {
          this.addDebugLog("decision", `Maximum Depth Reached: ${depth}`, {
            reason: "Depth limit reached (2)",
            finalButtons: buttons.length,
          });
        }

        return buttons.map(function (button) {
          return Object.assign({}, button, {
            refinement_level: depth,
            transform_history: transformHistory,
          });
        });
      }

      // Check API call limit
      if (this.apiCallCount >= 10) {
        console.log("API call limit reached: " + this.apiCallCount);

        if (debugMode) {
          this.addDebugLog(
            "decision",
            `API Call Limit Reached: ${this.apiCallCount}`,
            {
              reason: "API call limit (10)",
              finalButtons: buttons.length,
            }
          );
        }

        return buttons.map(function (button) {
          return Object.assign({}, button, {
            refinement_level: depth,
            transform_history: transformHistory,
          });
        });
      }

      // Process each button individually with focused cropping
      const refinedButtons = [];

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        console.log("Refining button: " + button.reference_name);

        if (debugMode) {
          this.addDebugLog(
            "refine",
            `Refining button: ${button.reference_name}`,
            {
              buttonName: button.reference_name,
              originalCoords: button.center_coordinates,
              confidence: button.confidence,
              depth: depth,
            }
          );
        }

        // Create a focused crop around this button
        const cropBounds = this.createFocusedCrop(
          button,
          imageDimensions,
          depth
        );

        if (debugMode) {
          this.addDebugLog(
            "crop",
            `Focused crop for ${button.reference_name}`,
            {
              buttonName: button.reference_name,
              cropBounds,
              depth: depth,
            }
          );
        }

        // Create the cropped image
        const croppedFile = await this.createCroppedImage(
          imageFile,
          cropBounds
        );

        // Store slice visualization
        if (debugMode) {
          const sliceVisualization = {
            id: `refine_${depth}_${button.reference_name}`,
            depth,
            buttonName: button.reference_name,
            cropBounds,
            originalDimensions: imageDimensions,
            originalCoords: button.center_coordinates,
            croppedImageUrl: URL.createObjectURL(croppedFile),
            timestamp: new Date().toISOString(),
          };
          sliceVisualizations.push(sliceVisualization);
        }

        // Analyze this focused crop
        this.apiCallCount++;
        const cropAnalysis = await this.analyzeImageForButtonsWithContext(
          croppedFile,
          button
        );

        if (debugMode) {
          this.addDebugLog(
            "api-response",
            `Focused analysis for ${button.reference_name}`,
            {
              buttonName: button.reference_name,
              callNumber: this.apiCallCount,
              buttonsFound: cropAnalysis.detected_buttons?.length || 0,
              depth: depth,
            }
          );
        }

        if (
          cropAnalysis.detected_buttons &&
          cropAnalysis.detected_buttons.length > 0
        ) {
          // Found button in focused crop
          const foundButton = cropAnalysis.detected_buttons[0]; // Take the best match

          // Transform coordinates back to original image space
          const originalCoords = this.transformCoordinates(
            foundButton.center_coordinates,
            cropBounds,
            transformHistory
          );

          if (debugMode) {
            this.addDebugLog(
              "math",
              `Coordinate transformation for ${button.reference_name}`,
              {
                buttonName: button.reference_name,
                cropCoordinates: foundButton.center_coordinates,
                cropBounds,
                transformHistory,
                calculation: {
                  step1: `Crop coords: (${foundButton.center_coordinates.x}, ${foundButton.center_coordinates.y})`,
                  step2: `Add crop offset: (${foundButton.center_coordinates.x} + ${cropBounds.x}, ${foundButton.center_coordinates.y} + ${cropBounds.y})`,
                  step3: `Apply transform history: ${
                    transformHistory.length > 0
                      ? transformHistory
                          .map((t) => `(+${t.x}, +${t.y})`)
                          .join(" ")
                      : "none"
                  }`,
                  result: `Final coordinates: (${originalCoords.x}, ${originalCoords.y})`,
                },
                originalCoords,
              }
            );
          }

          // Check if this is well-isolated (button takes up significant portion)
          const buttonCoverageRatio = this.calculateButtonCoverage(
            foundButton,
            cropBounds
          );

          if (debugMode) {
            this.addDebugLog(
              "coverage",
              `Coverage check for ${button.reference_name}`,
              {
                buttonName: button.reference_name,
                coverageRatio: buttonCoverageRatio,
                isWellIsolated: buttonCoverageRatio >= 0.3,
                depth: depth,
              }
            );
          }

          if (buttonCoverageRatio >= 0.3 || depth >= 1) {
            // Button is well-isolated or we've gone deep enough
            const refinedButton = Object.assign({}, foundButton, {
              center_coordinates: originalCoords,
              refinement_level: depth + 1,
              transform_history: transformHistory,
              coverage_ratio: buttonCoverageRatio,
              refinement_successful: true,
            });

            if (debugMode) {
              this.addDebugLog(
                "success",
                `Successfully refined ${button.reference_name}`,
                {
                  buttonName: button.reference_name,
                  oldCoords: button.center_coordinates,
                  newCoords: originalCoords,
                  coverageRatio: buttonCoverageRatio,
                  depth: depth + 1,
                }
              );
            }

            refinedButtons.push(refinedButton);
          } else {
            // Need to go deeper - recursively refine this button
            console.log(
              `Button ${button.reference_name} coverage ${buttonCoverageRatio} < 0.3, going deeper`
            );

            const deeperRefined = await this.recursiveSlicing(
              croppedFile,
              [
                Object.assign({}, foundButton, {
                  center_coordinates: foundButton.center_coordinates, // Use crop-relative coordinates
                }),
              ],
              { width: cropBounds.width, height: cropBounds.height },
              transformHistory.concat([{ x: cropBounds.x, y: cropBounds.y }]),
              depth + 1
            );

            refinedButtons.push.apply(refinedButtons, deeperRefined);
          }
        } else {
          // Button not found in focused crop, keep original
          console.log(
            "Button " +
              button.reference_name +
              " not found in focused crop, keeping original"
          );

          if (debugMode) {
            this.addDebugLog(
              "fallback",
              `Button not found in crop: ${button.reference_name}`,
              {
                buttonName: button.reference_name,
                action: "keeping_original",
                depth: depth,
              }
            );
          }

          refinedButtons.push(
            Object.assign({}, button, {
              refinement_level: depth,
              transform_history: transformHistory,
              refinement_failed: true,
            })
          );
        }
      }

      return refinedButtons;
    } catch (error) {
      if (debugMode) {
        this.addDebugLog("error", `Slicing Error at Depth ${depth}`, {
          depth,
          error: error.message,
          buttonsBeingProcessed: buttons.length,
        });
      }
      console.error(
        "Error in recursive slicing at depth " + depth + ":",
        error
      );
      // Return original buttons if slicing fails
      return buttons.map(function (button) {
        return Object.assign({}, button, {
          refinement_level: depth,
          transform_history: transformHistory,
          slicing_error: true,
        });
      });
    }
  }

  // NEW METHOD: Create a focused crop around a specific button
  createFocusedCrop(button, imageDimensions, depth) {
    const x = button.center_coordinates.x;
    const y = button.center_coordinates.y;

    // Calculate crop size based on depth - smaller crops for deeper levels
    let cropSizeMultiplier;
    if (depth === 0) {
      cropSizeMultiplier = 0.4; // 40% of image dimensions
    } else if (depth === 1) {
      cropSizeMultiplier = 0.6; // 60% of current dimensions (tighter focus)
    } else {
      cropSizeMultiplier = 0.8; // 80% of current dimensions (very tight)
    }

    const cropWidth = Math.min(
      imageDimensions.width * cropSizeMultiplier,
      imageDimensions.width
    );
    const cropHeight = Math.min(
      imageDimensions.height * cropSizeMultiplier,
      imageDimensions.height
    );

    // Center the crop on the button coordinates
    const cropX = Math.max(
      0,
      Math.min(x - cropWidth / 2, imageDimensions.width - cropWidth)
    );
    const cropY = Math.max(
      0,
      Math.min(y - cropHeight / 2, imageDimensions.height - cropHeight)
    );

    return {
      x: Math.round(cropX),
      y: Math.round(cropY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };
  }

  // Calculate how much of the crop the button takes up
  calculateButtonCoverage(button, cropBounds) {
    const buttonArea =
      button.estimated_size.width * button.estimated_size.height;
    const cropArea = cropBounds.width * cropBounds.height;
    return buttonArea / cropArea;
  }

  // MISSING HELPER METHODS - NOW IMPLEMENTED:

  shouldStopSlicing(buttons, imageWidth, imageHeight, depth) {
    // Stop if we've gone too deep
    if (depth >= 3) {
      console.log("Max depth reached");
      return true;
    }

    // Stop if we have very few buttons
    if (buttons.length <= 1) {
      console.log("Too few buttons to slice further");
      return true;
    }

    // Stop if image is getting too small
    const minDimension = 200;
    if (imageWidth < minDimension || imageHeight < minDimension) {
      console.log("Image too small for further slicing");
      return true;
    }

    // Stop if API calls are getting excessive
    if (this.apiCallCount >= 15) {
      console.log("API call limit reached");
      return true;
    }

    return false;
  }

  groupButtonsByRegion(buttons, imageWidth, imageHeight) {
    const regions = {
      "top-left": [],
      "top-right": [],
      "bottom-left": [],
      "bottom-right": [],
      center: [],
    };

    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const centerMargin = Math.min(imageWidth, imageHeight) * 0.2;

    buttons.forEach((button) => {
      const x = button.center_coordinates.x;
      const y = button.center_coordinates.y;

      // Check if button is in center region
      if (
        Math.abs(x - centerX) < centerMargin &&
        Math.abs(y - centerY) < centerMargin
      ) {
        regions.center.push(button);
      }
      // Otherwise, assign to quadrants
      else if (x < centerX && y < centerY) {
        regions["top-left"].push(button);
      } else if (x >= centerX && y < centerY) {
        regions["top-right"].push(button);
      } else if (x < centerX && y >= centerY) {
        regions["bottom-left"].push(button);
      } else {
        regions["bottom-right"].push(button);
      }
    });

    // Only return regions that have buttons
    const nonEmptyRegions = {};
    for (const region in regions) {
      if (regions[region].length > 0) {
        nonEmptyRegions[region] = regions[region];
      }
    }

    return nonEmptyRegions;
  }

  getRegionBounds(region, imageWidth, imageHeight) {
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const centerMargin = Math.min(imageWidth, imageHeight) * 0.2;

    switch (region) {
      case "top-left":
        return {
          x: 0,
          y: 0,
          width: centerX,
          height: centerY,
        };
      case "top-right":
        return {
          x: centerX,
          y: 0,
          width: centerX,
          height: centerY,
        };
      case "bottom-left":
        return {
          x: 0,
          y: centerY,
          width: centerX,
          height: centerY,
        };
      case "bottom-right":
        return {
          x: centerX,
          y: centerY,
          width: centerX,
          height: centerY,
        };
      case "center":
        return {
          x: centerX - centerMargin,
          y: centerY - centerMargin,
          width: centerMargin * 2,
          height: centerMargin * 2,
        };
      default:
        return {
          x: 0,
          y: 0,
          width: imageWidth,
          height: imageHeight,
        };
    }
  }

  async createCroppedImage(originalFile, cropBounds) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = cropBounds.width;
          canvas.height = cropBounds.height;

          ctx.drawImage(
            img,
            cropBounds.x,
            cropBounds.y,
            cropBounds.width,
            cropBounds.height,
            0,
            0,
            cropBounds.width,
            cropBounds.height
          );

          canvas.toBlob((blob) => {
            if (blob) {
              // Create a File object from the blob
              const croppedFile = new File([blob], "cropped.png", {
                type: "image/png",
              });
              resolve(croppedFile);
            } else {
              reject(new Error("Failed to create cropped image blob"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () =>
        reject(new Error("Failed to load image for cropping"));
      img.src = URL.createObjectURL(originalFile);
    });
  }

  transformCoordinates(cropCoordinates, cropBounds, transformHistory) {
    let x = cropCoordinates.x + cropBounds.x;
    let y = cropCoordinates.y + cropBounds.y;

    // Apply any previous transformations
    transformHistory.forEach((transform) => {
      x += transform.x;
      y += transform.y;
    });

    return { x: Math.round(x), y: Math.round(y) };
  }

  // Debug helper methods
  addDebugLog(type, message, data = {}) {
    debugLog.push({
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    });
  }

  getStoppingReason(buttons, imageWidth, imageHeight, depth) {
    if (depth >= 3) return "Maximum depth reached (3)";
    if (buttons.length <= 1) return "Too few buttons to slice further";
    if (imageWidth < 200 || imageHeight < 200)
      return "Image too small for further slicing";
    if (this.apiCallCount >= 15) return "API call limit reached (15)";
    return "Unknown stopping condition";
  }

  // XML parsing method to handle LLM response inconsistencies
  parseAnalysisFromXML(content) {
    try {
      // Extract detected buttons using regex
      const buttonsMatch = content.match(
        /<detected_buttons>([\s\S]*?)<\/detected_buttons>/
      );
      const summaryMatch = content.match(
        /<analysis_summary>([\s\S]*?)<\/analysis_summary>/
      );

      let detectedButtons = [];
      let analysisSummary = {
        total_elements_found: 0,
        image_description: "No description available",
      };

      if (buttonsMatch) {
        const buttonsXML = buttonsMatch[1];

        // Extract individual button elements
        const buttonMatches = buttonsXML.match(/<button>([\s\S]*?)<\/button>/g);

        if (buttonMatches) {
          detectedButtons = buttonMatches.map((buttonXML) => {
            const button = {};

            // Extract each field with regex
            const fields = {
              reference_name: /<reference_name>(.*?)<\/reference_name>/,
              description: /<description>([\s\S]*?)<\/description>/,
              element_type: /<element_type>(.*?)<\/element_type>/,
              confidence: /<confidence>(\d+)<\/confidence>/,
              center_x: /<center_x>(\d+)<\/center_x>/,
              center_y: /<center_y>(\d+)<\/center_y>/,
              width: /<width>(\d+)<\/width>/,
              height: /<height>(\d+)<\/height>/,
            };

            for (const [key, regex] of Object.entries(fields)) {
              const match = buttonXML.match(regex);
              if (match) {
                if (
                  key === "confidence" ||
                  key === "center_x" ||
                  key === "center_y" ||
                  key === "width" ||
                  key === "height"
                ) {
                  button[key] = parseInt(match[1]);
                } else {
                  button[key] = match[1].trim();
                }
              }
            }

            // Convert to expected format
            return {
              reference_name: button.reference_name || "unknown_button",
              description: button.description || "No description",
              element_type: button.element_type || "button",
              confidence: button.confidence || 50,
              center_coordinates: {
                x: button.center_x || 0,
                y: button.center_y || 0,
              },
              estimated_size: {
                width: button.width || 50,
                height: button.height || 30,
              },
            };
          });
        }
      }

      if (summaryMatch) {
        const summaryXML = summaryMatch[1];

        const totalMatch = summaryXML.match(
          /<total_elements_found>(\d+)<\/total_elements_found>/
        );
        const descMatch = summaryXML.match(
          /<image_description>([\s\S]*?)<\/image_description>/
        );

        if (totalMatch)
          analysisSummary.total_elements_found = parseInt(totalMatch[1]);
        if (descMatch) analysisSummary.image_description = descMatch[1].trim();
      }

      // If no XML found, try to fallback to JSON parsing
      if (detectedButtons.length === 0) {
        console.log("No XML tags found, attempting JSON fallback...");
        try {
          const jsonResult = JSON.parse(content);
          return jsonResult;
        } catch (jsonError) {
          console.log("JSON fallback also failed, returning empty result");
          return {
            detected_buttons: [],
            analysis_summary: {
              total_elements_found: 0,
              image_description:
                "Failed to parse response - content may be explanatory text instead of structured data",
            },
          };
        }
      }

      return {
        detected_buttons: detectedButtons,
        analysis_summary: analysisSummary,
      };
    } catch (error) {
      console.error("Error parsing XML response:", error);
      return {
        detected_buttons: [],
        analysis_summary: {
          total_elements_found: 0,
          image_description: "Error parsing response: " + error.message,
        },
      };
    }
  }
}

// Application state
let gpt4vDetector = null;
let selectedFile = null;
let analysisResults = null;
let imageDimensions = { width: 0, height: 0 };

// Debug state
let debugMode = false;
let debugLog = [];
let sliceVisualizations = [];

// DOM elements
let apiKeyInput, imageInput, uploadArea, imagePreview, previewImg;
let analyzeBtn,
  progressiveBtn,
  results,
  resultsContent,
  loading,
  buttonOverlays,
  exportJson;
let debugToggle, debugPanel, debugContent, sliceViewer;

// Initialize the application
function initializeApp() {
  try {
    // Get DOM elements
    apiKeyInput = document.getElementById("apiKeyInput");
    imageInput = document.getElementById("imageInput");
    uploadArea = document.getElementById("uploadArea");
    imagePreview = document.getElementById("imagePreview");
    previewImg = document.getElementById("previewImg");
    analyzeBtn = document.getElementById("analyzeBtn");
    progressiveBtn = document.getElementById("progressiveBtn");
    results = document.getElementById("results");
    resultsContent = document.getElementById("resultsContent");
    loading = document.getElementById("loading");
    buttonOverlays = document.getElementById("buttonOverlays");
    exportJson = document.getElementById("exportJson");

    // Debug elements
    debugToggle = document.getElementById("debugToggle");
    debugPanel = document.getElementById("debugPanel");
    debugContent = document.getElementById("debugContent");
    sliceViewer = document.getElementById("sliceViewer");

    // Validate that all elements exist
    const requiredElements = {
      apiKeyInput,
      imageInput,
      uploadArea,
      imagePreview,
      previewImg,
      analyzeBtn,
      progressiveBtn,
      results,
      resultsContent,
      loading,
      buttonOverlays,
      exportJson,
    };

    const debugElements = {
      debugToggle,
      debugPanel,
      debugContent,
      sliceViewer,
    };

    for (const [name, element] of Object.entries(requiredElements)) {
      if (!element) {
        throw new Error(`Required DOM element not found: ${name}`);
      }
    }

    // Debug elements are optional
    for (const [name, element] of Object.entries(debugElements)) {
      if (!element) {
        console.warn(
          `Debug element not found: ${name} - debug features will be disabled`
        );
      }
    }

    // Add event listeners
    uploadArea.addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", handleImageUpload);
    analyzeBtn.addEventListener("click", () => analyzeImage(false));
    progressiveBtn.addEventListener("click", () => analyzeImage(true));
    exportJson.addEventListener("click", exportAsJson);

    // Debug event listeners
    if (debugToggle) {
      debugToggle.addEventListener("change", toggleDebugMode);
    }

    console.log("GPT-4 Vision Button Detector initialized successfully");
  } catch (error) {
    console.error("Failed to initialize app:", error);
    alert("Failed to initialize application: " + error.message);
  }
}

function handleImageUpload(event) {
  try {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewImg.onload = () => {
          imageDimensions = {
            width: previewImg.naturalWidth,
            height: previewImg.naturalHeight,
          };
          console.log("Image dimensions:", imageDimensions);
        };
        imagePreview.classList.remove("hidden");
        results.classList.add("hidden");
        buttonOverlays.innerHTML = "";
      };
      reader.onerror = () => {
        alert("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file");
    }
  } catch (error) {
    console.error("Error handling image upload:", error);
    alert("Error uploading image: " + error.message);
  }
}

async function analyzeImage(useProgressiveSlicing = false) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Please enter your OpenAI API key");
    return;
  }

  if (!selectedFile) {
    alert("Please select an image");
    return;
  }

  try {
    // Initialize detector with API key
    gpt4vDetector = new GPT4VisionButtonDetector(apiKey);

    // Show loading state
    loading.classList.remove("hidden");
    results.classList.add("hidden");

    // Update loading text based on method
    const loadingText = document.querySelector(".loading-text");
    if (useProgressiveSlicing) {
      loadingText.textContent =
        "Analyzing with Progressive Slicing... This may take a moment.";
    } else {
      loadingText.textContent = "Analyzing with GPT-4 Vision...";
    }

    if (useProgressiveSlicing) {
      console.log("🎯 Starting progressive slicing analysis");
      analysisResults = await gpt4vDetector.analyzeWithProgressiveSlicing(
        selectedFile,
        imageDimensions
      );
    } else {
      console.log("📸 Starting standard analysis");
      analysisResults = await gpt4vDetector.analyzeImageForButtons(
        selectedFile
      );
      analysisResults.analysis_method = "standard";
      analysisResults.total_api_calls = 1;
    }

    displayResults(analysisResults);
  } catch (error) {
    console.error("Analysis error:", error);
    alert("Analysis failed: " + error.message);
  } finally {
    loading.classList.add("hidden");
  }
}

function displayResults(analysisResults) {
  try {
    if (
      !analysisResults.detected_buttons ||
      analysisResults.detected_buttons.length === 0
    ) {
      resultsContent.innerHTML =
        '<div class="no-results">No buttons detected in the image</div>';
      results.classList.remove("hidden");
      return;
    }

    // Clear previous overlays
    buttonOverlays.innerHTML = "";

    // Create results HTML with enhanced information
    const buttonsHtml = analysisResults.detected_buttons
      .map((button, index) => {
        const refinementBadge = button.refinement_level
          ? `<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded ml-2">Level ${button.refinement_level}</span>`
          : "";

        const regionInfo = button.crop_region
          ? `<div>Region: ${button.crop_region}</div>`
          : "";

        const errorInfo = button.slicing_error
          ? `<div class="text-red-600">⚠️ Slicing error occurred</div>`
          : "";

        return `
                <div class="result-item">
                    <div class="result-header">
                        <h4 class="result-name">${button.reference_name}</h4>
                        <div>
                            <span class="confidence-badge">${button.confidence}%</span>
                            ${refinementBadge}
                        </div>
                    </div>
                    <p class="result-description">${button.description}</p>
                    <div class="result-details">
                        <div>Type: ${button.element_type}</div>
                        <div>Center: (${button.center_coordinates.x}, ${button.center_coordinates.y})</div>
                        <div>Size: ${button.estimated_size.width}×${button.estimated_size.height}px</div>
                        ${regionInfo}
                        ${errorInfo}
                    </div>
                </div>
            `;
      })
      .join("");

    const methodBadge =
      analysisResults.analysis_method === "progressive_slicing"
        ? '<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Progressive Slicing</span>'
        : '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Standard Analysis</span>';

    const apiCallInfo = analysisResults.total_api_calls
      ? `<p class="text-xs text-blue-600 mt-1">API calls used: ${analysisResults.total_api_calls}</p>`
      : "";

    const summaryHtml = `
            <div class="summary-box">
                <div class="flex justify-between items-start">
                    <h4 class="summary-title">Found ${analysisResults.detected_buttons.length} clickable elements</h4>
                    ${methodBadge}
                </div>
                <p class="summary-text">${analysisResults.analysis_summary.image_description}</p>
                ${apiCallInfo}
            </div>
        `;

    resultsContent.innerHTML =
      summaryHtml + '<div class="results-container">' + buttonsHtml + "</div>";

    // Add visual overlays with different colors for refinement levels
    addButtonOverlays(analysisResults.detected_buttons);
    results.classList.remove("hidden");
  } catch (error) {
    console.error("Error displaying results:", error);
    resultsContent.innerHTML =
      '<div class="no-results">Error displaying results: ' +
      error.message +
      "</div>";
    results.classList.remove("hidden");
  }
}

function addButtonOverlays(buttons) {
  try {
    const scaleX = previewImg.offsetWidth / imageDimensions.width;
    const scaleY = previewImg.offsetHeight / imageDimensions.height;

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

      // Different colors based on refinement level
      const dotColor =
        button.refinement_level && button.refinement_level > 0
          ? "bg-purple-500"
          : "bg-red-500";

      // Add error indicator
      const errorIndicator = button.slicing_error ? " ⚠️" : "";

      overlay.innerHTML = `
                <div class="button-dot ${dotColor}"></div>
                <div class="button-label">${button.reference_name}${errorIndicator}</div>
            `;

      buttonOverlays.appendChild(overlay);
    });
  } catch (error) {
    console.error("Error adding button overlays:", error);
  }
}

function exportAsJson() {
  try {
    if (!analysisResults) {
      alert("No analysis results to export");
      return;
    }

    const jsonData = JSON.stringify(analysisResults, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "button_coordinates.json";
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting JSON:", error);
    alert("Error exporting JSON: " + error.message);
  }
}

// Debug functions
function toggleDebugMode() {
  debugMode = debugToggle ? debugToggle.checked : false;
  if (debugPanel) {
    debugPanel.classList.toggle("hidden", !debugMode);
  }
  console.log("Debug mode:", debugMode ? "enabled" : "disabled");
}

function updateDebugPanel() {
  if (!debugMode || !debugContent) return;

  const logHtml = debugLog
    .map((entry, index) => {
      const typeClass = getDebugTypeClass(entry.type);
      const dataHtml =
        entry.data && Object.keys(entry.data).length > 0
          ? `<pre class="debug-data">${JSON.stringify(
              entry.data,
              null,
              2
            )}</pre>`
          : "";

      return `
            <div class="debug-entry ${typeClass}">
                <div class="debug-header">
                    <span class="debug-type">${entry.type.toUpperCase()}</span>
                    <span class="debug-time">${new Date(
                      entry.timestamp
                    ).toLocaleTimeString()}</span>
                </div>
                <div class="debug-message">${entry.message}</div>
                ${dataHtml}
            </div>
        `;
    })
    .join("");

  debugContent.innerHTML = logHtml;

  // Update slice viewer
  updateSliceViewer();
}

function updateSliceViewer() {
  if (!debugMode || !sliceViewer) return;

  // Check if sliceVisualizations exists and has content
  if (!sliceVisualizations || sliceVisualizations.length === 0) {
    sliceViewer.innerHTML =
      "<p>No slices created yet. Run Progressive Slicing Analysis to see image crops.</p>";
    return;
  }

  const slicesHtml = sliceVisualizations
    .map((slice) => {
      // Ensure slice has required properties
      if (!slice || !slice.id) return "";

      // Handle different slice types
      let buttonsInfo = "";
      if (slice.buttonsInRegion && Array.isArray(slice.buttonsInRegion)) {
        buttonsInfo = slice.buttonsInRegion
          .map(
            (btn) =>
              `<div class="slice-button-info">
                    <strong>${btn.name || "Unknown"}</strong> (${
                btn.confidence || 0
              }%)
                    <br>Original: (${
                      btn.originalCoords ? btn.originalCoords.x : "N/A"
                    }, ${btn.originalCoords ? btn.originalCoords.y : "N/A"})
                </div>`
          )
          .join("");
      } else if (slice.buttonName) {
        buttonsInfo = `<div class="slice-button-info">
                <strong>Searching for: ${slice.buttonName}</strong>
                <br>Original: (${
                  slice.originalCoords ? slice.originalCoords.x : "N/A"
                }, ${slice.originalCoords ? slice.originalCoords.y : "N/A"})
            </div>`;
      }

      return `
            <div class="slice-item">
                <div class="slice-header">
                    <h4>Depth ${slice.depth || 0} - ${
        slice.region || slice.buttonName || "Unknown"
      }</h4>
                    <span class="slice-time">${
                      slice.timestamp
                        ? new Date(slice.timestamp).toLocaleTimeString()
                        : "Unknown time"
                    }</span>
                </div>
                <div class="slice-info">
                    <div>Crop: ${
                      slice.cropBounds
                        ? `${slice.cropBounds.x},${slice.cropBounds.y} (${slice.cropBounds.width}×${slice.cropBounds.height})`
                        : "Unknown bounds"
                    }</div>
                    ${
                      slice.searchingFor
                        ? `<div>Searching for: ${slice.searchingFor}</div>`
                        : ""
                    }
                </div>
                <div class="slice-image-container">
                    ${
                      slice.croppedImageUrl
                        ? `<img src="${slice.croppedImageUrl}" alt="Slice ${slice.id}" class="slice-image" />`
                        : "<div>No image available</div>"
                    }
                    <div class="slice-buttons">
                        ${buttonsInfo}
                    </div>
                </div>
            </div>
        `;
    })
    .filter((html) => html !== "")
    .join(""); // Filter out empty strings

  sliceViewer.innerHTML = slicesHtml || "<p>No valid slices to display</p>";
}

function getDebugTypeClass(type) {
  const typeClasses = {
    info: "debug-info",
    "api-call": "debug-api-call",
    "api-response": "debug-api-response",
    slice: "debug-slice",
    crop: "debug-crop",
    math: "debug-math",
    grouping: "debug-grouping",
    decision: "debug-decision",
    success: "debug-success",
    error: "debug-error",
  };
  return typeClasses[type] || "debug-default";
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
