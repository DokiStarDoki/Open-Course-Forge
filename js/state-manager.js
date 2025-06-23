/**
 * Course Forge MVP - State Management
 * Handles global application state with persistence and change notifications
 */

class StateManager {
  constructor() {
    this.state = {
      currentTab: "input",
      courseConfig: { ...CONFIG.DEFAULTS.COURSE_CONFIG },
      chunks: [],
      generatedSlides: [],
      isProcessing: false,
      processingStep: null,
      errors: [],
      lastSaved: null,
    };

    this.listeners = new Map();
    this.loadState();

    // Auto-save state periodically
    this.setupAutoSave();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("StateManager initialized with state:", this.state);
    }
  }

  /**
   * Set a value in the state using dot notation
   * @param {string} path - Dot notation path (e.g., 'courseConfig.title')
   * @param {*} value - Value to set
   */
  setState(path, value) {
    const keys = path.split(".");
    let current = this.state;

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;

    // Update last saved timestamp
    this.state.lastSaved = new Date().toISOString();

    // Notify listeners
    this.notifyListeners(path, value, oldValue);

    // Trigger auto-save
    this.saveState();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`State updated: ${path} =`, value);
    }
  }

  /**
   * Get a value from the state using dot notation
   * @param {string} path - Dot notation path (empty string returns entire state)
   * @returns {*} The value at the specified path
   */
  getState(path = "") {
    if (!path) return this.state;

    const keys = path.split(".");
    let current = this.state;

    for (const key of keys) {
      if (current[key] === undefined) return undefined;
      current = current[key];
    }

    return current;
  }

  /**
   * Subscribe to state changes at a specific path
   * @param {string} path - Path to watch for changes
   * @param {Function} callback - Callback function (newValue, oldValue) => {}
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Subscribed to state changes at: ${path}`);
    }
  }

  /**
   * Unsubscribe from state changes
   * @param {string} path - Path to stop watching
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(path, callback) {
    if (this.listeners.has(path)) {
      this.listeners.get(path).delete(callback);
      if (this.listeners.get(path).size === 0) {
        this.listeners.delete(path);
      }
    }
  }

  /**
   * Notify all listeners for a specific path and parent paths
   * @param {string} path - Path that changed
   * @param {*} newValue - New value
   * @param {*} oldValue - Previous value
   */
  notifyListeners(path, newValue, oldValue) {
    // Notify exact path listeners
    if (this.listeners.has(path)) {
      this.listeners.get(path).forEach((callback) => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in state listener for ${path}:`, error);
        }
      });
    }

    // Notify parent path listeners (for nested changes)
    const pathParts = path.split(".");
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join(".");
      if (this.listeners.has(parentPath)) {
        const parentValue = this.getState(parentPath);
        this.listeners.get(parentPath).forEach((callback) => {
          try {
            callback(parentValue, undefined);
          } catch (error) {
            console.error(
              `Error in parent state listener for ${parentPath}:`,
              error
            );
          }
        });
      }
    }
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      const stateToSave = {
        ...this.state,
        // Don't save processing state or errors
        isProcessing: false,
        processingStep: null,
        errors: [],
      };

      localStorage.setItem(
        CONFIG.LOCAL_STORAGE_KEYS.COURSE_STATE,
        JSON.stringify(stateToSave)
      );

      if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
        console.log("State saved to localStorage");
      }
    } catch (error) {
      console.warn("Failed to save state to localStorage:", error);
      this.addError("Failed to save progress. Your work may not be preserved.");
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem(
        CONFIG.LOCAL_STORAGE_KEYS.COURSE_STATE
      );
      if (saved) {
        const parsedState = JSON.parse(saved);

        // Merge with default state to handle new properties
        this.state = {
          ...this.state,
          ...parsedState,
          // Reset processing state on load
          isProcessing: false,
          processingStep: null,
          errors: [],
        };

        if (CONFIG.DEBUG.ENABLED) {
          console.log("State loaded from localStorage");
        }
      }
    } catch (error) {
      console.warn("Failed to load state from localStorage:", error);
      this.addError("Failed to load previous session. Starting fresh.");
    }
  }

  /**
   * Clear all state and localStorage
   */
  clearState() {
    this.state = {
      currentTab: "input",
      courseConfig: { ...CONFIG.DEFAULTS.COURSE_CONFIG },
      chunks: [],
      generatedSlides: [],
      isProcessing: false,
      processingStep: null,
      errors: [],
      lastSaved: null,
    };

    try {
      localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEYS.COURSE_STATE);
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }

    // Notify all listeners of the reset
    this.listeners.forEach((callbacks, path) => {
      const newValue = this.getState(path);
      callbacks.forEach((callback) => {
        try {
          callback(newValue, undefined);
        } catch (error) {
          console.error(`Error in reset listener for ${path}:`, error);
        }
      });
    });

    if (CONFIG.DEBUG.ENABLED) {
      console.log("State cleared");
    }
  }

  /**
   * Load state from exported course data
   * @param {Object} courseData - Exported course data
   */
  loadFromCourseData(courseData) {
    try {
      // Validate the course data structure
      if (!this.validateCourseData(courseData)) {
        throw new Error("Invalid course data format");
      }

      // Merge course data with current state
      if (courseData.courseConfig) {
        this.setState("courseConfig", {
          ...CONFIG.DEFAULTS.COURSE_CONFIG,
          ...courseData.courseConfig,
        });
      }

      if (courseData.chunks) {
        this.setState("chunks", courseData.chunks);
      }

      if (courseData.generatedSlides) {
        this.setState("generatedSlides", courseData.generatedSlides);
      }

      // Determine which tab to show based on available data
      if (courseData.generatedSlides && courseData.generatedSlides.length > 0) {
        this.setState("currentTab", "generation");
      } else if (courseData.chunks && courseData.chunks.length > 0) {
        this.setState("currentTab", "chunking");
      } else {
        this.setState("currentTab", "input");
      }

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Course data loaded successfully");
      }

      return true;
    } catch (error) {
      console.error("Failed to load course data:", error);
      this.addError(`Failed to load course: ${error.message}`);
      return false;
    }
  }

  /**
   * Export current state as course data
   * @returns {Object} Exportable course data
   */
  exportCourseData() {
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      courseConfig: this.getState("courseConfig"),
      chunks: this.getState("chunks"),
      generatedSlides: this.getState("generatedSlides"),
    };
  }

  /**
   * Validate course data structure
   * @param {Object} data - Course data to validate
   * @returns {boolean} True if valid
   */
  validateCourseData(data) {
    if (!data || typeof data !== "object") return false;

    // Check for required properties
    if (data.courseConfig && typeof data.courseConfig !== "object")
      return false;
    if (data.chunks && !Array.isArray(data.chunks)) return false;
    if (data.generatedSlides && !Array.isArray(data.generatedSlides))
      return false;

    return true;
  }

  /**
   * Add an error to the error list
   * @param {string} message - Error message
   * @param {string} type - Error type (optional)
   */
  addError(message, type = "error") {
    const error = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    const currentErrors = this.getState("errors") || [];
    this.setState("errors", [...currentErrors, error]);

    if (CONFIG.DEBUG.ENABLED) {
      console.error("Error added:", error);
    }
  }

  /**
   * Remove an error by ID
   * @param {string} errorId - Error ID to remove
   */
  removeError(errorId) {
    const currentErrors = this.getState("errors") || [];
    const updatedErrors = currentErrors.filter((error) => error.id !== errorId);
    this.setState("errors", updatedErrors);
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.setState("errors", []);
  }

  /**
   * Set up auto-save functionality
   */
  setupAutoSave() {
    // Save state every 30 seconds if there are changes
    setInterval(() => {
      if (this.state.lastSaved) {
        const lastSaveTime = new Date(this.state.lastSaved).getTime();
        const now = Date.now();

        // Only save if more than 30 seconds have passed since last save
        if (now - lastSaveTime > 30000) {
          this.saveState();
        }
      }
    }, 30000);

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      this.saveState();
    });
  }

  /**
   * Get processing status
   * @returns {Object} Processing status information
   */
  getProcessingStatus() {
    return {
      isProcessing: this.getState("isProcessing"),
      step: this.getState("processingStep"),
      hasErrors: (this.getState("errors") || []).length > 0,
    };
  }

  /**
   * Set processing status
   * @param {boolean} isProcessing - Whether processing is active
   * @param {string} step - Current processing step
   */
  setProcessingStatus(isProcessing, step = null) {
    this.setState("isProcessing", isProcessing);
    this.setState("processingStep", step);
  }
}
