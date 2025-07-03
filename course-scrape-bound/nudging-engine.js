// NudgingEngine.js - Simplified nudging system with fixed distances
class NudgingEngine {
  constructor() {
    this.nudgeHistory = [];
    this.nudgeDistance = 20; // Fixed nudge distance in pixels
  }

  // Simple nudging - no complex analysis, just move by fixed amount
  applySmartNudging(corrections, button, buttonIndex) {
    console.log(
      `📝 Applying simple nudging to ${
        corrections.length
      } corrections for button ${buttonIndex + 1}`
    );

    return corrections.map((correction) => {
      const originalBbox = button.bounding_box;
      const direction =
        correction.move_direction || correction.adjustment_direction || "none";

      // Track original position
      const originalPosition = { x: originalBbox.x, y: originalBbox.y };

      // Calculate simple nudge
      const nudgeResult = this.calculateSimpleNudge(direction, originalBbox);

      // Apply nudge to create new coordinates
      const newPosition = {
        x: Math.max(0, Math.round(originalPosition.x + nudgeResult.nudgeX)),
        y: Math.max(0, Math.round(originalPosition.y + nudgeResult.nudgeY)),
      };

      // Log the nudging event
      this.logNudgingEvent(
        button,
        buttonIndex,
        originalPosition,
        newPosition,
        direction
      );

      console.log(
        `📝 Simple nudging button ${buttonIndex + 1}: ${direction} from (${
          originalPosition.x
        }, ${originalPosition.y}) to (${newPosition.x}, ${newPosition.y})`
      );

      return {
        button_number: buttonIndex + 1,
        issue: "simple alignment adjustment",
        new_bbox_x: newPosition.x,
        new_bbox_y: newPosition.y,
        new_bbox_width: originalBbox.width,
        new_bbox_height: originalBbox.height,
        nudging_applied: true,
        nudge_type: "simple_nudge",
        nudge_direction: direction,
        nudge_distance: this.nudgeDistance,
        alignment_analysis: correction.alignment_analysis,
        original_bbox: originalBbox,
        nudge_vector: {
          x: Math.round(nudgeResult.nudgeX),
          y: Math.round(nudgeResult.nudgeY),
        },
      };
    });
  }

  // Calculate simple nudge based on direction
  calculateSimpleNudge(direction, originalBbox) {
    let nudgeX = 0;
    let nudgeY = 0;

    switch (direction.toLowerCase()) {
      case "left":
        nudgeX = -this.nudgeDistance;
        break;
      case "right":
        nudgeX = this.nudgeDistance;
        break;
      case "up":
        nudgeY = -this.nudgeDistance;
        break;
      case "down":
        nudgeY = this.nudgeDistance;
        break;
      default:
        console.log(`⚠️ Unknown direction: ${direction}`);
        break;
    }

    return { nudgeX, nudgeY };
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

        // Add simple correction metadata
        correctedButtons[buttonIndex].correction_applied = {
          issue: correction.issue,
          original_bbox: originalBbox,
          nudging_applied: correction.nudging_applied || false,
          nudge_direction: correction.nudge_direction,
          nudge_type: "simple_nudge",
          nudge_distance: this.nudgeDistance,
          position_change: {
            x: correction.new_bbox_x - originalBbox.x,
            y: correction.new_bbox_y - originalBbox.y,
          },
        };

        // Debug logging
        if (typeof debugLogger !== "undefined") {
          debugLogger.addLog(
            "simple-correction-applied",
            `✅ Simple correction applied to button ${correction.button_number} (${buttonName})`,
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
              nudgeDirection: correction.nudge_direction,
              nudgeDistance: this.nudgeDistance,
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

  // Log nudging event
  logNudgingEvent(
    button,
    buttonIndex,
    originalPosition,
    newPosition,
    direction
  ) {
    if (typeof debugLogger !== "undefined") {
      debugLogger.addNudgingEvent(
        { name: button.reference_name, index: buttonIndex + 1 },
        originalPosition,
        {
          nudge_type: "simple_nudge",
          nudge_direction: direction,
          nudge_distance: this.nudgeDistance,
          nudgeX: newPosition.x - originalPosition.x,
          nudgeY: newPosition.y - originalPosition.y,
        },
        newPosition
      );

      debugLogger.addLog(
        "simple-nudging",
        `🎯 Simple nudging applied to button ${buttonIndex + 1} (${
          button.reference_name
        })`,
        {
          buttonName: button.reference_name,
          direction: direction,
          nudgeDistance: this.nudgeDistance,
          nudgeVector: {
            x: newPosition.x - originalPosition.x,
            y: newPosition.y - originalPosition.y,
          },
          originalPosition: originalPosition,
          newPosition: newPosition,
        }
      );
    }
  }

  // Get simple nudging statistics
  getNudgingStats() {
    if (typeof debugLogger !== "undefined") {
      const nudgingEvents = debugLogger.getNudgingEvents();

      return {
        totalNudges: nudgingEvents.length,
        nudgeDistance: this.nudgeDistance,
        directions: this.groupBy(nudgingEvents, "nudgeData.direction"),
        buttonsNudged: new Set(nudgingEvents.map((e) => e.buttonInfo.name))
          .size,
      };
    }

    return {
      totalNudges: 0,
      nudgeDistance: this.nudgeDistance,
      directions: {},
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

  // Clear nudging history
  clearHistory() {
    this.nudgeHistory = [];
  }

  // Get nudging history
  getHistory() {
    return this.nudgeHistory;
  }
}
