// OverlayGenerator.js - Creates visual overlays for single button analysis
class OverlayGenerator {
  constructor() {
    this.overlayCache = new Map();
  }

  // Create enhanced single-button overlay with clear visual indicators
  async createSingleButtonOverlay(
    originalFile,
    button,
    buttonNumber,
    cycleNumber
  ) {
    console.log(
      `🎨 Creating single-button overlay for: ${button.reference_name}`
    );

    // Check cache first
    const cacheKey = `${button.reference_name}_${buttonNumber}_${cycleNumber}`;
    if (this.overlayCache.has(cacheKey)) {
      console.log(`📋 Using cached overlay for ${button.reference_name}`);
      return this.overlayCache.get(cacheKey);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the original image
          ctx.drawImage(img, 0, 0);

          // Create the overlay
          this.drawSingleButtonOverlay(
            ctx,
            button,
            buttonNumber,
            cycleNumber,
            canvas.width,
            canvas.height
          );

          // Convert canvas to blob URL
          canvas.toBlob((blob) => {
            if (blob) {
              const overlayUrl = URL.createObjectURL(blob);

              // Cache the result
              this.overlayCache.set(cacheKey, overlayUrl);

              console.log(
                `✅ Single-button overlay created for: ${button.reference_name}`
              );
              resolve(overlayUrl);
            } else {
              reject(new Error("Failed to create single button overlay"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () =>
        reject(new Error("Failed to load image for single button overlay"));
      img.src = URL.createObjectURL(originalFile);
    });
  }

  // Draw the single button overlay elements
  drawSingleButtonOverlay(
    ctx,
    button,
    buttonNumber,
    cycleNumber,
    canvasWidth,
    canvasHeight
  ) {
    const bbox = button.bounding_box;

    // Use BRIGHT RED for single button focus
    const borderColor = "#ff0000";
    const overlayColor = "rgba(255, 255, 255, 0.4)";

    // Add subtle dimming to the rest of the image
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw bright white overlay inside bounding box
    ctx.fillStyle = overlayColor;
    ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);

    // Draw thick bounding box border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

    // Draw quadrant system
    this.drawQuadrantSystem(ctx, bbox, borderColor);

    // Draw quadrant numbers
    this.drawQuadrantNumbers(ctx, bbox);

    // Draw main label
    this.drawMainLabel(ctx, button, bbox, borderColor);

    // Draw center intersection point
    this.drawCenterPoint(ctx, bbox);

    // Draw cycle information
    this.drawCycleInfo(ctx, cycleNumber, buttonNumber);
  }

  // Draw the quadrant system (cross lines)
  drawQuadrantSystem(ctx, bbox, borderColor) {
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, bbox.y);
    ctx.lineTo(centerX, bbox.y + bbox.height);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(bbox.x, centerY);
    ctx.lineTo(bbox.x + bbox.width, centerY);
    ctx.stroke();

    ctx.setLineDash([]); // Reset to solid lines
  }

  // Draw quadrant numbers
  drawQuadrantNumbers(ctx, bbox) {
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    ctx.fillStyle = "#000000";
    ctx.font = "bold 28px Arial";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    const quadrantOffset = 18;

    // Helper function to draw outlined text
    const drawOutlinedText = (text, x, y) => {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    };

    // Draw quadrant numbers
    drawOutlinedText("1", bbox.x + quadrantOffset, bbox.y + 32);
    drawOutlinedText("2", centerX + quadrantOffset, bbox.y + 32);
    drawOutlinedText("3", bbox.x + quadrantOffset, centerY + 32);
    drawOutlinedText("4", centerX + quadrantOffset, centerY + 32);
  }

  // Draw main label
  drawMainLabel(ctx, button, bbox, borderColor) {
    const labelText = `🎯 FOCUS: ${button.reference_name}`;
    const labelPadding = 12;
    const labelHeight = 36;

    ctx.font = "bold 20px Arial";
    const textMetrics = ctx.measureText(labelText);
    const labelWidth = textMetrics.width + labelPadding * 2;

    // Label background with gradient
    const gradient = ctx.createLinearGradient(
      bbox.x,
      bbox.y - labelHeight - 4,
      bbox.x,
      bbox.y
    );
    gradient.addColorStop(0, borderColor);
    gradient.addColorStop(1, "#cc0000");
    ctx.fillStyle = gradient;
    ctx.fillRect(bbox.x, bbox.y - labelHeight - 4, labelWidth, labelHeight);

    // Label text
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeText(labelText, bbox.x + labelPadding, bbox.y - 14);
    ctx.fillText(labelText, bbox.x + labelPadding, bbox.y - 14);
  }

  // Draw center intersection point
  drawCenterPoint(ctx, bbox) {
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // White center dot
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
    ctx.fill();

    // Black border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Draw cycle information
  drawCycleInfo(ctx, cycleNumber, buttonNumber) {
    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(10, 10, 200, 50);

    // Text
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`CYCLE ${cycleNumber} - BUTTON ${buttonNumber}`, 15, 30);
    ctx.fillText(`SINGLE BUTTON ANALYSIS`, 15, 50);
  }

  // Create a combined overlay showing all buttons (for cycle display)
  async createCombinedOverlay(originalFile, buttons, cycleNumber) {
    console.log(`🎨 Creating combined overlay for ${buttons.length} buttons`);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the original image
          ctx.drawImage(img, 0, 0);

          // Draw all buttons
          buttons.forEach((button, index) => {
            this.drawButtonInCombinedOverlay(
              ctx,
              button,
              index + 1,
              cycleNumber
            );
          });

          // Convert canvas to blob URL
          canvas.toBlob((blob) => {
            if (blob) {
              const overlayUrl = URL.createObjectURL(blob);
              console.log(
                `✅ Combined overlay created for ${buttons.length} buttons`
              );
              resolve(overlayUrl);
            } else {
              reject(new Error("Failed to create combined overlay"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () =>
        reject(new Error("Failed to load image for combined overlay"));
      img.src = URL.createObjectURL(originalFile);
    });
  }

  // Draw a single button in the combined overlay
  drawButtonInCombinedOverlay(ctx, button, buttonNumber, cycleNumber) {
    const bbox = button.bounding_box;

    // Different colors for different cycles
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ff00ff"];
    const color = colors[(cycleNumber - 1) % colors.length];

    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

    // Draw cross to create quadrants
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Vertical line of cross
    ctx.beginPath();
    ctx.moveTo(centerX, bbox.y);
    ctx.lineTo(centerX, bbox.y + bbox.height);
    ctx.stroke();

    // Horizontal line of cross
    ctx.beginPath();
    ctx.moveTo(bbox.x, centerY);
    ctx.lineTo(bbox.x + bbox.width, centerY);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw quadrant numbers
    ctx.fillStyle = color;
    ctx.font = "bold 16px Arial";
    const quadrantOffset = 8;

    ctx.fillText("1", bbox.x + quadrantOffset, bbox.y + 20);
    ctx.fillText("2", centerX + quadrantOffset, bbox.y + 20);
    ctx.fillText("3", bbox.x + quadrantOffset, centerY + 20);
    ctx.fillText("4", centerX + quadrantOffset, centerY + 20);

    // Draw main label
    const labelText = `#${buttonNumber}: ${button.reference_name}`;
    const labelPadding = 6;
    const labelHeight = 24;

    // Label background
    ctx.fillStyle = color;
    ctx.fillRect(
      bbox.x,
      bbox.y - labelHeight - 2,
      ctx.measureText(labelText).width + labelPadding * 2,
      labelHeight
    );

    // Label text
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText(labelText, bbox.x + labelPadding, bbox.y - 8);

    // Draw center intersection point
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Add white border to center point
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Create a simple highlight overlay for debugging
  async createHighlightOverlay(
    originalFile,
    button,
    highlightColor = "#ffff00"
  ) {
    console.log(`🎨 Creating highlight overlay for: ${button.reference_name}`);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the original image
          ctx.drawImage(img, 0, 0);

          const bbox = button.bounding_box;

          // Draw simple highlight
          ctx.strokeStyle = highlightColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

          // Draw center point
          const centerX = bbox.x + bbox.width / 2;
          const centerY = bbox.y + bbox.height / 2;

          ctx.fillStyle = highlightColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
          ctx.fill();

          // Convert canvas to blob URL
          canvas.toBlob((blob) => {
            if (blob) {
              const overlayUrl = URL.createObjectURL(blob);
              console.log(
                `✅ Highlight overlay created for: ${button.reference_name}`
              );
              resolve(overlayUrl);
            } else {
              reject(new Error("Failed to create highlight overlay"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () =>
        reject(new Error("Failed to load image for highlight overlay"));
      img.src = URL.createObjectURL(originalFile);
    });
  }

  // Create overlay with alignment visualization
  async createAlignmentVisualizationOverlay(
    originalFile,
    button,
    alignmentData,
    buttonNumber
  ) {
    console.log(
      `🎨 Creating alignment visualization for: ${button.reference_name}`
    );

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the original image
          ctx.drawImage(img, 0, 0);

          const bbox = button.bounding_box;

          // Choose color based on alignment quality
          let borderColor = "#ff0000"; // Default red
          if (alignmentData && alignmentData.alignment_quality) {
            switch (alignmentData.alignment_quality.toLowerCase()) {
              case "excellent":
                borderColor = "#00ff00"; // Green
                break;
              case "good":
                borderColor = "#00aa00"; // Dark green
                break;
              case "poor":
                borderColor = "#ff8800"; // Orange
                break;
              case "terrible":
                borderColor = "#ff0000"; // Red
                break;
            }
          }

          // Draw bounding box with alignment-based color
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 5;
          ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

          // Draw alignment status
          this.drawAlignmentStatus(ctx, bbox, alignmentData, borderColor);

          // Draw suggested correction if needed
          if (alignmentData && alignmentData.needs_adjustment) {
            this.drawSuggestedCorrection(ctx, bbox, alignmentData);
          }

          // Convert canvas to blob URL
          canvas.toBlob((blob) => {
            if (blob) {
              const overlayUrl = URL.createObjectURL(blob);
              console.log(
                `✅ Alignment visualization created for: ${button.reference_name}`
              );
              resolve(overlayUrl);
            } else {
              reject(new Error("Failed to create alignment visualization"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () =>
        reject(new Error("Failed to load image for alignment visualization"));
      img.src = URL.createObjectURL(originalFile);
    });
  }

  // Draw alignment status information
  drawAlignmentStatus(ctx, bbox, alignmentData, borderColor) {
    if (!alignmentData) return;

    const statusText = `${
      alignmentData.alignment_quality || "unknown"
    } alignment`;
    const adjustmentText = alignmentData.needs_adjustment
      ? `Needs: ${alignmentData.suggested_shift || "adjustment"}`
      : "No adjustment needed";

    // Background for status
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(bbox.x, bbox.y + bbox.height + 5, 250, 40);

    // Status text
    ctx.fillStyle = borderColor;
    ctx.font = "bold 14px Arial";
    ctx.fillText(statusText, bbox.x + 5, bbox.y + bbox.height + 20);
    ctx.fillText(adjustmentText, bbox.x + 5, bbox.y + bbox.height + 38);
  }

  // Draw suggested correction arrow
  drawSuggestedCorrection(ctx, bbox, alignmentData) {
    if (
      !alignmentData.adjustment_direction ||
      alignmentData.adjustment_direction === "none"
    )
      return;

    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    const arrowLength = 50;

    let endX = centerX;
    let endY = centerY;

    // Calculate arrow end position based on direction
    switch (alignmentData.adjustment_direction.toLowerCase()) {
      case "up":
        endY = centerY - arrowLength;
        break;
      case "down":
        endY = centerY + arrowLength;
        break;
      case "left":
        endX = centerX - arrowLength;
        break;
      case "right":
        endX = centerX + arrowLength;
        break;
      case "up-left":
        endX = centerX - arrowLength * 0.7;
        endY = centerY - arrowLength * 0.7;
        break;
      case "up-right":
        endX = centerX + arrowLength * 0.7;
        endY = centerY - arrowLength * 0.7;
        break;
      case "down-left":
        endX = centerX - arrowLength * 0.7;
        endY = centerY + arrowLength * 0.7;
        break;
      case "down-right":
        endX = centerX + arrowLength * 0.7;
        endY = centerY + arrowLength * 0.7;
        break;
    }

    // Draw arrow
    ctx.strokeStyle = "#ffff00"; // Yellow arrow
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const headLength = 15;
    const angle = Math.atan2(endY - centerY, endX - centerX);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  // Clear overlay cache
  clearCache() {
    // Revoke all cached URLs to free memory
    for (const url of this.overlayCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.overlayCache.clear();
    console.log("🧹 Overlay cache cleared");
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.overlayCache.size,
      cachedOverlays: Array.from(this.overlayCache.keys()),
    };
  }

  // Validate overlay creation parameters
  validateOverlayParams(button, buttonNumber, cycleNumber) {
    if (!button) {
      throw new Error("Button object is required for overlay creation");
    }

    if (!button.bounding_box) {
      throw new Error("Button must have bounding_box property");
    }

    if (!button.reference_name) {
      throw new Error("Button must have reference_name property");
    }

    if (typeof buttonNumber !== "number" || buttonNumber < 1) {
      throw new Error("Button number must be a positive integer");
    }

    if (typeof cycleNumber !== "number" || cycleNumber < 1) {
      throw new Error("Cycle number must be a positive integer");
    }

    const bbox = button.bounding_box;
    if (
      typeof bbox.x !== "number" ||
      typeof bbox.y !== "number" ||
      typeof bbox.width !== "number" ||
      typeof bbox.height !== "number"
    ) {
      throw new Error(
        "Bounding box must have numeric x, y, width, and height properties"
      );
    }

    if (bbox.width <= 0 || bbox.height <= 0) {
      throw new Error("Bounding box width and height must be positive");
    }
  }

  // Create overlay with error handling
  async createOverlayWithErrorHandling(overlayType, ...args) {
    try {
      switch (overlayType) {
        case "single":
          return await this.createSingleButtonOverlay(...args);
        case "combined":
          return await this.createCombinedOverlay(...args);
        case "highlight":
          return await this.createHighlightOverlay(...args);
        case "alignment":
          return await this.createAlignmentVisualizationOverlay(...args);
        default:
          throw new Error(`Unknown overlay type: ${overlayType}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${overlayType} overlay:`, error);
      throw new Error(
        `Failed to create ${overlayType} overlay: ${error.message}`
      );
    }
  }
}
