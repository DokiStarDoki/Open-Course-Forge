/**
 * Course Forge MVP - State Manager
 * Manages application state with persistence and reactivity
 */

class StateManager {
  constructor() {
    this.state = {
      courseConfig: {
        title: "",
        estimatedDuration: "45 minutes",
        targetAudience: "business professionals",
        learningObjectives: [],
        additionalGuidance: "",
        uploadedFiles: [],
        sourceContent: "",
      },
      chunks: [],
      isProcessing: false,
      processingStep: "",
      lastSaved: null,
      errors: [],
    };

    this.subscribers = new Map();
    this.autoSaveTimeout = null;
    this.saveInProgress = false;

    this.loadState();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("StateManager initialized");
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    this.subscribers.get(path).push(callback);

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`State subscriber added for: ${path}`);
    }
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(path, callback) {
    if (this.subscribers.has(path)) {
      const callbacks = this.subscribers.get(path);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);

        if (CONFIG.DEBUG.ENABLED) {
          console.log(`State subscriber removed for: ${path}`);
        }
      }
    }
  }

  /**
   * Get state value by path
   */
  getState(path) {
    if (!path) return this.state;

    const parts = path.split(".");
    let current = this.state;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set state value by path
   */
  setState(path, value) {
    const parts = path.split(".");
    let current = this.state;

    // Navigate to parent object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    const oldValue = current[lastPart];
    current[lastPart] = value;

    // Notify subscribers
    this.notifySubscribers(path, value, oldValue);

    // Schedule auto-save
    this.scheduleAutoSave();
  }

  /**
   * Notify subscribers of state changes
   */
  notifySubscribers(path, value, oldValue) {
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).forEach((callback) => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`Error in state subscriber for ${path}:`, error);
        }
      });
    }

    // Also notify parent path subscribers
    const parts = path.split(".");
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join(".");
      if (this.subscribers.has(parentPath)) {
        this.subscribers.get(parentPath).forEach((callback) => {
          try {
            callback(this.getState(parentPath), this.getState(parentPath));
          } catch (error) {
            console.error(
              `Error in parent state subscriber for ${parentPath}:`,
              error
            );
          }
        });
      }
    }
  }

  /**
   * Set processing status
   */
  setProcessingStatus(isProcessing, step = "") {
    this.setState("isProcessing", isProcessing);
    this.setState("processingStep", step);
  }

  /**
   * Add error to state
   */
  addError(message, context = "general") {
    const error = {
      message,
      context,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };

    const errors = this.getState("errors") || [];
    errors.push(error);
    this.setState("errors", errors);

    if (CONFIG.DEBUG.ENABLED) {
      console.error(`Error added to state: ${context} - ${message}`);
    }
  }

  /**
   * Remove error from state
   */
  removeError(errorId) {
    const errors = this.getState("errors") || [];
    const filteredErrors = errors.filter((error) => error.id !== errorId);
    this.setState("errors", filteredErrors);
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.setState("errors", []);
  }

  /**
   * Export course data for saving/sharing
   */
  exportCourseData() {
    return {
      courseConfig: this.getState("courseConfig"),
      chunks: this.getState("chunks"),
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * Import course data
   */
  importCourseData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid import data");
    }

    if (data.courseConfig) {
      this.setState("courseConfig", {
        ...this.state.courseConfig,
        ...data.courseConfig,
      });
    }

    if (data.chunks && Array.isArray(data.chunks)) {
      this.setState("chunks", data.chunks);
    }

    StatusManager.showSuccess("Course data imported successfully");
  }

  /**
   * Schedule auto-save
   */
  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.saveState();
    }, CONFIG.UI.AUTO_SAVE_DELAY);
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    if (this.saveInProgress) return;

    this.saveInProgress = true;

    try {
      const stateToSave = {
        courseConfig: this.state.courseConfig,
        chunks: this.state.chunks,
        lastSaved: new Date().toISOString(),
        version: "1.0",
      };

      localStorage.setItem("courseForge", JSON.stringify(stateToSave));
      this.setState("lastSaved", stateToSave.lastSaved);
    } catch (error) {
      console.error("Failed to save state:", error);
      this.addError("Failed to save state: " + error.message, "state");
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem("courseForge");
      if (saved) {
        const data = JSON.parse(saved);

        if (data.courseConfig) {
          this.state.courseConfig = {
            ...this.state.courseConfig,
            ...data.courseConfig,
          };
        }

        if (data.chunks && Array.isArray(data.chunks)) {
          this.state.chunks = data.chunks;
        }

        if (data.lastSaved) {
          this.state.lastSaved = data.lastSaved;
        }

        if (CONFIG.DEBUG.ENABLED) {
          console.log("State loaded from localStorage");
        }
      }
    } catch (error) {
      console.error("Failed to load state:", error);
      this.addError("Failed to load saved state: " + error.message, "state");
    }
  }

  /**
   * Clear all state
   */
  clearState() {
    this.state = {
      courseConfig: {
        title: "",
        estimatedDuration: "45 minutes",
        targetAudience: "business professionals",
        learningObjectives: [],
        additionalGuidance: "",
        uploadedFiles: [],
        sourceContent: "",
      },
      chunks: [],
      isProcessing: false,
      processingStep: "",
      lastSaved: null,
      errors: [],
    };

    localStorage.removeItem("courseForge");

    // Notify all subscribers
    this.subscribers.forEach((callbacks, path) => {
      callbacks.forEach((callback) => {
        try {
          callback(this.getState(path));
        } catch (error) {
          console.error(`Error in state subscriber for ${path}:`, error);
        }
      });
    });

    StatusManager.showSuccess("All data cleared");
  }

  /**
   * Get state summary for debugging
   */
  getStateSummary() {
    const chunks = this.getState("chunks") || [];
    const config = this.getState("courseConfig") || {};

    return {
      hasTitle: !!config.title,
      hasSourceContent: !!config.sourceContent,
      uploadedFiles: (config.uploadedFiles || []).length,
      totalChunks: chunks.length,
      chunksWithContent: chunks.filter((c) => c.sourceContent).length,
      chunksWithGenerated: chunks.filter((c) => c.generatedContent).length,
      lockedChunks: chunks.filter((c) => c.isLocked).length,
      lastSaved: this.getState("lastSaved"),
      errors: (this.getState("errors") || []).length,
      isProcessing: this.getState("isProcessing"),
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.saveState();
    this.subscribers.clear();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("StateManager cleaned up");
    }
  }
}
