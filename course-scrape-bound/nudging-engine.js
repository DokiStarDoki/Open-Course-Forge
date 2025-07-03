// NudgingEngine.js - Smart nudging and corrections system
class NudgingEngine {
  constructor() {
    this.nudgeHistory = [];
  }

  // Apply smart nudging to corrections
  applySmartNudging(corrections, button, buttonIndex) {
    console.log(
      `📝 Applying smart nudging to ${
        corrections.length
      } corrections for button ${buttonIndex + 1}`
    );

    return corrections.map((correction) => {
      const originalBbox = button.bounding_box;
      const systematicAnalysis = correction.systematic_analysis;
      const alignmentAnalysis = correction.alignment_analysis;

      // Track original position for nudging event
      const originalPosition = { x: originalBbox.x, y: originalBbox.y };

      // If we have specific coordinates, use them directly
      if (this.hasValidCoordinates(correction)) {
        const newPosition = {
          x: correction.new_bbox_x,
          y: correction.new_bbox_y,
        };

        this.logNudgingEvent(
          button,
          buttonIndex,
          originalPosition,
          newPosition,
          "direct_coordinates",
          correction.adjustment_direction || "specified",
          0,
          systematicAnalysis,
          alignmentAnalysis
        );

        return {
          ...correction,
          button_number: buttonIndex + 1,
          nudging_applied: false,
          original_coordinates: true,
          enhanced_tracking: true,
        };
      }

      // Calculate nudge based on available analysis
      const nudgeResult = this.calculateNudge(
        correction,
        originalBbox,
        systematicAnalysis,
        alignmentAnalysis
      );

      // Apply nudges to create new coordinates
      const newPosition = this.applyNudgeToPosition(
        originalPosition,
        nudgeResult
      );

      // Log the nudging event
      this.logNudgingEvent(
        button,
        buttonIndex,
        originalPosition,
        newPosition,
        nudgeResult.nudgeType,
        nudgeResult.direction,
        nudgeResult.multiplier,
        systematicAnalysis,
        alignmentAnalysis
      );

      console.log(
        `📝 Nudging button ${buttonIndex + 1}: ${nudgeResult.nudgeType} (${
          nudgeResult.multiplier
        }x) from (${originalPosition.x}, ${originalPosition.y}) to (${
          newPosition.x
        }, ${newPosition.y})`
      );

      return {
        button_number: buttonIndex + 1,
        issue: correction.correction_type || "smart positioning adjustment",
        new_bbox_x: newPosition.x,
        new_bbox_y: newPosition.y,
        new_bbox_width: originalBbox.width,
        new_bbox_height: originalBbox.height,
        nudging_applied: true,
        nudge_type: nudgeResult.nudgeType,
        nudge_direction: nudgeResult.direction,
        nudge_multiplier: nudgeResult.multiplier,
        systematic_analysis: systematicAnalysis,
        alignment_analysis: alignmentAnalysis,
        original_bbox: originalBbox,
        enhanced_nudging: true,
        nudge_vector: {
          x: Math.round(nudgeResult.nudgeX),
          y: Math.round(nudgeResult.nudgeY),
        },
      };
    });
  }

  // Apply bounding box corrections to buttons
  applyBoundingBoxCorrections(buttons, corrections) {
    console.log(
      `📝 Applying ${corrections.length} bounding box corrections...`
    );

    const correctedButtons = [...buttons];

    corrections.forEach((correction, correctionIndex) => {
      const buttonIndex = correction.button_number - 1; // Convert to 0-based index

      if (buttonIndex >= 0 && buttonIndex < correctedButtons.length) {
        const originalBbox = correctedButtons[buttonIndex].bounding_box;
        const buttonName = correctedButtons[buttonIndex].reference_name;

        console.log(
          `📍 Applying correction ${correctionIndex + 1} to button ${
            correction.button_number
          } (${buttonName})`
        );

        // Update the bounding box
        correctedButtons[buttonIndex].bounding_box = {
          x: correction.new_bbox_x,
          y: correction.new_bbox_y,
          width: correction.new_bbox_width || originalBbox.width,
          height: correction.new_bbox_height || originalBbox.height,
        };

        // Add correction metadata
        correctedButtons[buttonIndex].correction_applied = {
          issue: correction.issue,
          original_bbox: originalBbox,
          nudging_applied: correction.nudging_applied || false,
          nudge_direction: correction.nudge_direction,
          nudge_type: correction.nudge_type,
          nudge_multiplier: correction.nudge_multiplier,
          correction_cycle: correction.cycle || "unknown",
          enhanced_correction: true,
          position_change: {
            x: correction.new_bbox_x - originalBbox.x,
            y: correction.new_bbox_y - originalBbox.y,
          },
        };

        // Debug logging
        if (typeof debugLogger !== "undefined") {
          debugLogger.addLog(
            "correction-applied",
            `✅ Correction applied to button ${correction.button_number} (${buttonName})`,
            {
              buttonName: buttonName,
              originalPosition: { x: originalBbox.x, y: originalBbox.y },
              newPosition: {
                x: correction.new_bbox_x,
                y: correction.new_bbox_y,
              },
              positionChange: {
                x: correction.new_bbox_x - originalBbox.x,
                y: correction.new_bbox_y - originalBbox.y,
              },
              nudgingApplied: correction.nudging_applied,
              correctionType: correction.nudge_type,
            }
          );
        }
      } else {
        console.warn(
          `⚠️ Invalid button index for correction: ${correction.button_number}`
        );
      }
    });

    console.log(`✅ Applied corrections to ${corrections.length} buttons`);
    return correctedButtons;
  }

  // Helper method to check if correction has valid coordinates
  hasValidCoordinates(correction) {
    return (
      correction.new_bbox_x !== undefined &&
      correction.new_bbox_y !== undefined &&
      !isNaN(correction.new_bbox_x) &&
      !isNaN(correction.new_bbox_y) &&
      correction.new_bbox_x > 0 &&
      correction.new_bbox_y > 0
    );
  }

  // Calculate nudge based on available analysis
  calculateNudge(
    correction,
    originalBbox,
    systematicAnalysis,
    alignmentAnalysis
  ) {
    let nudgeX = 0;
    let nudgeY = 0;
    let nudgeType = "unknown";
    let nudgeMultiplier = 0.5;
    let direction = "unknown";

    if (systematicAnalysis) {
      const result = this.calculateSystematicNudge(
        systematicAnalysis,
        originalBbox,
        correction
      );
      nudgeX = result.nudgeX;
      nudgeY = result.nudgeY;
      nudgeType = result.nudgeType;
      nudgeMultiplier = result.nudgeMultiplier;
      direction = result.direction;
    } else if (alignmentAnalysis) {
      const result = this.calculateAlignmentNudge(
        alignmentAnalysis,
        originalBbox,
        correction
      );
      nudgeX = result.nudgeX;
      nudgeY = result.nudgeY;
      nudgeType = result.nudgeType;
      nudgeMultiplier = result.nudgeMultiplier;
      direction = result.direction;
    } else {
      const result = this.calculateFallbackNudge(correction, originalBbox);
      nudgeX = result.nudgeX;
      nudgeY = result.nudgeY;
      nudgeType = result.nudgeType;
      nudgeMultiplier = result.nudgeMultiplier;
      direction = result.direction;
    }

    return {
      nudgeX,
      nudgeY,
      nudgeType,
      nudgeMultiplier,
      direction,
    };
  }

  // Calculate nudge based on systematic analysis
  calculateSystematicNudge(systematicAnalysis, originalBbox, correction) {
    const { box_overlaps_button, compass_direction, overlap_percentage } =
      systematicAnalysis;

    let nudgeMultiplier = 0.5;
    let nudgeType = "unknown";

    // Determine nudge multiplier based on overlap
    if (!box_overlaps_button) {
      nudgeMultiplier = 1.2;
      nudgeType = "major_repositioning";
    } else if (overlap_percentage < 30) {
      nudgeMultiplier = 0.9;
      nudgeType = "significant_adjustment";
    } else if (overlap_percentage < 70) {
      nudgeMultiplier = 0.6;
      nudgeType = "moderate_adjustment";
    } else {
      nudgeMultiplier = 0.3;
      nudgeType = "fine_tuning";
    }

    let nudgeX = 0;
    let nudgeY = 0;
    let direction = compass_direction || "unknown";

    // Calculate nudge based on compass direction
    if (compass_direction && compass_direction !== "none") {
      const nudgeResult = this.calculateCompassNudge(
        compass_direction,
        originalBbox,
        nudgeMultiplier
      );
      nudgeX = nudgeResult.nudgeX;
      nudgeY = nudgeResult.nudgeY;
    } else if (correction.move_direction) {
      const nudgeResult = this.calculateDirectionalNudge(
        correction.move_direction,
        originalBbox,
        nudgeMultiplier
      );
      nudgeX = nudgeResult.nudgeX;
      nudgeY = nudgeResult.nudgeY;
      direction = correction.move_direction;
    }

    return { nudgeX, nudgeY, nudgeType, nudgeMultiplier, direction };
  }

  // Calculate nudge based on alignment analysis
  calculateAlignmentNudge(alignmentAnalysis, originalBbox, correction) {
    const { adjustment_direction } = alignmentAnalysis;
    const nudgeMultiplier = 0.7; // Medium adjustment for alignment corrections
    const nudgeType = "alignment_adjustment";

    let nudgeX = 0;
    let nudgeY = 0;
    let direction = adjustment_direction || "unknown";

    if (adjustment_direction && adjustment_direction !== "none") {
      const nudgeResult = this.calculateDirectionalNudge(
        adjustment_direction,
        originalBbox,
        nudgeMultiplier
      );
      nudgeX = nudgeResult.nudgeX;
      nudgeY = nudgeResult.nudgeY;
    }

    return { nudgeX, nudgeY, nudgeType, nudgeMultiplier, direction };
  }

  // Calculate fallback nudge
  calculateFallbackNudge(correction, originalBbox) {
    const direction =
      correction.move_direction || correction.correction_type || "unknown";
    const nudgeMultiplier = 0.5;
    const nudgeType = "fallback_nudging";

    let nudgeX = 0;
    let nudgeY = 0;

    if (direction) {
      const nudgeResult = this.calculateDirectionalNudge(
        direction,
        originalBbox,
        nudgeMultiplier
      );
      nudgeX = nudgeResult.nudgeX;
      nudgeY = nudgeResult.nudgeY;
    }

    return { nudgeX, nudgeY, nudgeType, nudgeMultiplier, direction };
  }

  // Calculate nudge based on compass direction
  calculateCompassNudge(compassDirection, originalBbox, nudgeMultiplier) {
    let nudgeX = 0;
    let nudgeY = 0;

    switch (compassDirection.toLowerCase()) {
      case "north":
        nudgeY = -originalBbox.height * nudgeMultiplier;
        break;
      case "south":
        nudgeY = originalBbox.height * nudgeMultiplier;
        break;
      case "east":
        nudgeX = originalBbox.width * nudgeMultiplier;
        break;
      case "west":
        nudgeX = -originalBbox.width * nudgeMultiplier;
        break;
      case "northeast":
        nudgeX = originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = -originalBbox.height * nudgeMultiplier * 0.7;
        break;
      case "northwest":
        nudgeX = -originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = -originalBbox.height * nudgeMultiplier * 0.7;
        break;
      case "southeast":
        nudgeX = originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = originalBbox.height * nudgeMultiplier * 0.7;
        break;
      case "southwest":
        nudgeX = -originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = originalBbox.height * nudgeMultiplier * 0.7;
        break;
    }

    return { nudgeX, nudgeY };
  }

  // Calculate nudge based on directional instruction
  calculateDirectionalNudge(direction, originalBbox, nudgeMultiplier) {
    let nudgeX = 0;
    let nudgeY = 0;

    switch (direction.toLowerCase()) {
      case "left":
      case "west":
        nudgeX = -originalBbox.width * nudgeMultiplier;
        break;
      case "right":
      case "east":
        nudgeX = originalBbox.width * nudgeMultiplier;
        break;
      case "up":
      case "north":
        nudgeY = -originalBbox.height * nudgeMultiplier;
        break;
      case "down":
      case "south":
        nudgeY = originalBbox.height * nudgeMultiplier;
        break;
      case "up-left":
      case "northwest":
        nudgeX = -originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = -originalBbox.height * nudgeMultiplier * 0.7;
        break;
      case "up-right":
      case "northeast":
        nudgeX = originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = -originalBbox.height * nudgeMultiplier * 0.7;
        break;
      case "down-left":
      case "southwest":
        nudgeX = -originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = originalBbox.height * nudgeMultiplier * 0.7;
        break;
      case "down-right":
      case "southeast":
        nudgeX = originalBbox.width * nudgeMultiplier * 0.7;
        nudgeY = originalBbox.height * nudgeMultiplier * 0.7;
        break;
    }

    return { nudgeX, nudgeY };
  }

  // Apply nudge to position with bounds checking
  applyNudgeToPosition(originalPosition, nudgeResult) {
    const newX = Math.max(
      0,
      Math.round(originalPosition.x + nudgeResult.nudgeX)
    );
    const newY = Math.max(
      0,
      Math.round(originalPosition.y + nudgeResult.nudgeY)
    );

    return { x: newX, y: newY };
  }

  // Log nudging event
  logNudgingEvent(
    button,
    buttonIndex,
    originalPosition,
    newPosition,
    nudgeType,
    direction,
    multiplier,
    systematicAnalysis,
    alignmentAnalysis
  ) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addNudgingEvent(
        { name: button.reference_name, index: buttonIndex + 1 },
        originalPosition,
        {
          nudge_type: nudgeType,
          nudge_direction: direction,
          nudge_multiplier: multiplier,
          nudgeX: newPosition.x - originalPosition.x,
          nudgeY: newPosition.y - originalPosition.y,
          systematic_analysis: systematicAnalysis,
          alignment_analysis: alignmentAnalysis,
        },
        newPosition
      );

      debugLogger.addLog(
        "smart-nudging",
        `🎯 Smart nudging applied to button ${buttonIndex + 1} (${
          button.reference_name
        })`,
        {
          buttonName: button.reference_name,
          systematicAnalysis: systematicAnalysis,
          alignmentAnalysis: alignmentAnalysis,
          nudgeType: nudgeType,
          nudgeMultiplier: multiplier,
          direction: direction,
          nudgeVector: {
            x: newPosition.x - originalPosition.x,
            y: newPosition.y - originalPosition.y,
          },
          originalPosition: originalPosition,
          newPosition: newPosition,
          enhanced: true,
        }
      );
    }
  }

  // Get nudging statistics
  getNudgingStats() {
    if (typeof debugLogger !== "undefined") {
      const nudgingEvents = debugLogger.getNudgingEvents();

      return {
        totalNudges: nudgingEvents.length,
        nudgeTypes: this.groupBy(nudgingEvents, "nudgeData.type"),
        directions: this.groupBy(nudgingEvents, "nudgeData.direction"),
        averageMultiplier: this.calculateAverageMultiplier(nudgingEvents),
        buttonsNudged: new Set(nudgingEvents.map((e) => e.buttonInfo.name))
          .size,
      };
    }

    return {
      totalNudges: 0,
      nudgeTypes: {},
      directions: {},
      averageMultiplier: 0,
      buttonsNudged: 0,
    };
  }

  // Helper method to group array by property
  groupBy(array, property) {
    return array.reduce((acc, item) => {
      const key = this.getNestedProperty(item, property);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  // Helper method to get nested property
  getNestedProperty(obj, property) {
    return (
      property
        .split(".")
        .reduce((current, prop) => current && current[prop], obj) || "unknown"
    );
  }

  // Helper method to calculate average multiplier
  calculateAverageMultiplier(nudgingEvents) {
    if (nudgingEvents.length === 0) return 0;

    const sum = nudgingEvents.reduce((total, event) => {
      return total + (event.nudgeData.nudge_multiplier || 0);
    }, 0);

    return sum / nudgingEvents.length;
  }

  // Clear nudging history
  clearHistory() {
    this.nudgeHistory = [];
  }

  // Get nudging history
  getHistory() {
    return this.nudgeHistory;
  }
}
