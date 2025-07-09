/**
 * Course Forge MVP - Main Application Controller (FIXED)
 * Coordinates all application components and handles initialization
 */

class CourseForgeApp {
  constructor() {
    // Core systems
    this.stateManager = new StateManager();
    this.eventSystem = new EventSystem();
    this.tabManager = new TabManager(this.stateManager, this.eventSystem);

    // UI Controllers - THESE WILL BE ASSIGNED TO GLOBAL VARIABLES
    this.fileUploadController = null;
    this.coursePreviewController = null;
    this.chunkUIController = null;
    this.generationUIController = null;

    // Initialize timer tracking
    this.timers = [];
    this.cachedElements = new Map();
    this.eventHandlers = new Map();

    // Component initialization (async)
    this.initializeComponents()
      .then(() => {
        this.setupControllers();
        this.setupEventListeners();
        this.restoreUIFromState();

        // FIXED: Ensure proper controller reference passing
        this.linkControllers();

        // ADDED: Extra delay to ensure all controllers are ready for UI updates
        setTimeout(() => {
          if (this.fileUploadController) {
            console.log("Final UI sync - updating file upload display");
            this.fileUploadController.updateUploadedFilesUI();
          }
        }, 200);

        // Initialize Lucide icons
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }

        // Show initialization success
        StatusManager.showSuccess("Course Forge MVP initialized successfully!");

        if (CONFIG.DEBUG.ENABLED) {
          console.log("CourseForgeApp initialized");
          this.setupDebugConsole();
        }
      })
      .catch((error) => {
        console.error("Failed to initialize app:", error);
        StatusManager.showError(
          "Failed to initialize application fully. Some features may not work."
        );
      });
  }

  /**
   * Initialize core application components with proper async handling
   */
  async initializeComponents() {
    // Check browser support
    const support = FileProcessor.checkBrowserSupport();
    if (!support.allSupported) {
      console.warn("Some browser features are not supported:", support);
      if (!support.fileReader) {
        StatusManager.showError(
          "Your browser does not support file reading. Please use a modern browser."
        );
        return;
      }
    }

    // Initialize LLM Service with proper async handling
    try {
      this.llmService = new LLMService();

      // FIXED: Wait for LLM service to be ready before proceeding
      StatusManager.showLoading("Initializing AI service...");
      await this.llmService.ensureReady();
      StatusManager.hide();

      console.log("✅ LLM Service initialized and ready");
    } catch (error) {
      console.error("Failed to initialize LLM Service:", error);
      StatusManager.showWarning(
        "AI features may not work properly. Check your API configuration."
      );
      // Continue without AI service - app should still work for non-AI features
      this.llmService = null;
    }

    // Initialize managers with proper dependency injection
    this.chunkManager = new ChunkManager(this.stateManager, this.eventSystem);

    // FIXED: Set LLM service reference in chunk manager
    if (this.llmService) {
      this.chunkManager.setLLMService(this.llmService);
    }

    this.contentGenerator = new ContentGenerator(
      this.stateManager,
      this.eventSystem,
      this.llmService
    );

    // Set up auto-save and validation
    this.setupAutoSaveIndicator();
    this.initializeFormValidation();
  }

  /**
   * Initialize UI controllers (FIXED to assign global variables and proper references)
   */
  setupControllers() {
    console.log("Setting up controllers...");

    // Create controllers and assign to both instance and global variables
    this.fileUploadController = new FileUploadController(
      this.stateManager,
      this.eventSystem
    );
    // Note: FileUploadController assigns itself to window.fileUploadController in constructor

    this.coursePreviewController = new CoursePreviewController(
      this.stateManager,
      this.eventSystem
    );
    window.coursePreviewController = this.coursePreviewController;

    this.chunkUIController = new ChunkUIController(
      this.stateManager,
      this.eventSystem
    );
    window.chunkUIController = this.chunkUIController;

    this.generationUIController = new GenerationUIController(
      this.stateManager,
      this.eventSystem
    );
    window.generationUIController = this.generationUIController;

    // Verify all controllers are properly assigned
    if (CONFIG.DEBUG.ENABLED) {
      console.log("Controllers initialized:", {
        fileUploadController: !!window.fileUploadController,
        coursePreviewController: !!window.coursePreviewController,
        chunkUIController: !!window.chunkUIController,
        generationUIController: !!window.generationUIController,
      });
    }

    // Double-check fileUploadController assignment
    if (!window.fileUploadController && this.fileUploadController) {
      window.fileUploadController = this.fileUploadController;
      console.log("Manually assigned fileUploadController to global scope");
    }
  }

  /**
   * FIXED: Link controllers with proper references
   */
  linkControllers() {
    // Set chunk manager reference in chunk UI controller
    if (this.chunkUIController && this.chunkManager) {
      this.chunkUIController.setChunkManager(this.chunkManager);
    }

    // FIXED: Set content generator reference in generation UI controller
    if (this.generationUIController && this.contentGenerator) {
      this.generationUIController.setContentGenerator(this.contentGenerator);
      console.log("✅ Content generator linked to generation UI controller");
    } else {
      console.error(
        "❌ Failed to link content generator to generation UI controller"
      );
    }

    // Initialize all controllers
    if (this.chunkUIController) {
      this.chunkUIController.initialize();
    }

    if (this.generationUIController) {
      this.generationUIController.initialize();
    }
  }

  /**
   * Set up main event listeners
   */
  setupEventListeners() {
    // Navigation events
    this.setupNavigationEvents();

    // Form input events
    this.setupFormEvents();

    // State change reactions
    this.setupStateReactions();

    // Window events
    this.setupWindowEvents();
  }

  /**
   * Set up navigation button events
   */
  setupNavigationEvents() {
    const navigationEvents = [
      { id: "rechunkBtn", handler: () => this.rechunkContent() },
      { id: "addChunkBtn", handler: () => this.chunkManager.addNewChunk() },
      { id: "exportJsonBtn", handler: () => this.exportCourseJson() },
      { id: "exportHtmlBtn", handler: () => this.exportCourseHtml() },
      {
        id: "previewCourseBtn",
        handler: () => this.coursePreviewController.previewCourse(),
      },
      {
        id: "loadCourseBtn",
        handler: () => this.triggerCourseLoad(),
      },
      // FIXED: Generate all button - ensure it's properly handled here as backup
      {
        id: "generateAllBtn",
        handler: () => this.generateAllContent(),
      },
    ];

    navigationEvents.forEach(({ id, handler }) => {
      const element = this.safeGetElement(id);
      if (element) {
        element.addEventListener("click", handler);
        this.eventHandlers.set(id, { element, event: "click", handler });
      }
    });
  }

  /**
   * FIXED: Generate all content method with better error handling
   */
  async generateAllContent() {
    console.log("App.generateAllContent called");

    if (!this.contentGenerator) {
      console.error("Content generator not initialized");
      StatusManager.showError("Content generator not initialized");
      return;
    }

    try {
      console.log("Calling contentGenerator.generateAllContent...");
      await this.contentGenerator.generateAllContent();
    } catch (error) {
      console.error("Generate all content failed in app:", error);
      StatusManager.showError(`Generate all failed: ${error.message}`);
    }
  }

  /**
   * Trigger course load (FIXED)
   */
  triggerCourseLoad() {
    if (this.fileUploadController) {
      this.fileUploadController.triggerCourseLoad();
    } else if (window.fileUploadController) {
      window.fileUploadController.triggerCourseLoad();
    } else {
      StatusManager.showError("File upload controller not available");
    }
  }

  /**
   * Set up form input events
   */
  setupFormEvents() {
    const formEvents = [
      { id: "courseTitle", path: "courseConfig.title" },
      { id: "estimatedDuration", path: "courseConfig.estimatedDuration" },
      { id: "targetAudience", path: "courseConfig.targetAudience" },
      { id: "additionalGuidance", path: "courseConfig.additionalGuidance" },
    ];

    formEvents.forEach(({ id, path }) => {
      const element = this.safeGetElement(id);
      if (element) {
        const handler = (e) => this.stateManager.setState(path, e.target.value);
        element.addEventListener("input", handler);
        this.eventHandlers.set(id, { element, event: "input", handler });
      }
    });

    // Special handling for learning objectives
    const learningObjectivesEl = this.safeGetElement("learningObjectives");
    if (learningObjectivesEl) {
      const handler = (e) => {
        const objectives = e.target.value
          .split("\n")
          .filter((obj) => obj.trim());
        this.stateManager.setState(
          "courseConfig.learningObjectives",
          objectives
        );
      };
      learningObjectivesEl.addEventListener("input", handler);
      this.eventHandlers.set("learningObjectives", {
        element: learningObjectivesEl,
        event: "input",
        handler,
      });
    }
  }

  /**
   * Set up state change reactions
   */
  setupStateReactions() {
    // React to course config changes
    this.stateManager.subscribe("courseConfig", () => {
      this.validateInputForm();
    });

    // React to processing state changes
    this.stateManager.subscribe("isProcessing", (isProcessing) => {
      this.updateProcessingUI(isProcessing);
    });
  }

  /**
   * Set up window events with proper cleanup tracking
   */
  setupWindowEvents() {
    this.beforeUnloadHandler = (e) => {
      const hasUnsavedWork = this.hasUnsavedWork();
      if (hasUnsavedWork) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved work. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    this.errorHandler = (event) => {
      this.handleError(event.error, "Unhandled");
    };

    this.rejectionHandler = (event) => {
      this.handleError(new Error(event.reason), "Promise Rejection");
      event.preventDefault();
    };

    this.onlineHandler = () => StatusManager.showSuccess("Connection restored");
    this.offlineHandler = () =>
      StatusManager.showWarning(
        "You are offline. Your work will be saved locally."
      );

    // Add listeners
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
    window.addEventListener("error", this.errorHandler);
    window.addEventListener("unhandledrejection", this.rejectionHandler);
    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);
  }

  /**
   * Proceed to chunking tab
   */
  async proceedToChunking() {
    const isValid = this.tabManager.validateCourseConfig(
      this.stateManager.getState("courseConfig")
    );

    if (!isValid) {
      StatusManager.showError(
        "Please complete all required fields before proceeding"
      );
      return;
    }

    StatusManager.showSuccess("Ready for content chunking!");
    this.tabManager.switchTab("chunking");
  }

  /**
   * Rechunk content using AI
   */
  async rechunkContent() {
    if (!this.chunkManager) {
      StatusManager.showError("Chunk manager not initialized");
      return;
    }

    const courseConfig = this.stateManager.getState("courseConfig");

    if (!this.tabManager.validateCourseConfig(courseConfig)) {
      StatusManager.showError("Please complete the course configuration first");
      return;
    }

    const existingChunks = this.stateManager.getState("chunks") || [];
    if (existingChunks.length > 0) {
      const hasUnlockedChunks = existingChunks.some((chunk) => !chunk.isLocked);
      if (hasUnlockedChunks) {
        const confirmed = confirm(
          "This will regenerate unlocked chunks. Locked chunks will be preserved. Continue?"
        );
        if (!confirmed) return;
      }
    }

    await this.chunkManager.generateChunks(courseConfig);
  }

  /**
   * Export course as JSON (FIXED - Always use state manager format for save/load compatibility)
   */
  exportCourseJson() {
    // ALWAYS use state manager format for JSON exports
    // This ensures the exported JSON can be loaded back into Course Forge
    const courseData = this.stateManager.exportCourseData();

    const jsonString = JSON.stringify(courseData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `course-${timestamp}.json`;

    FileProcessor.downloadAsFile(jsonString, filename, "application/json");
    StatusManager.showSuccess("Course exported as JSON");

    if (CONFIG.DEBUG.ENABLED) {
      console.log("Course JSON exported in state manager format:", courseData);
    }
  }

  /**
   * Export course as HTML (FIXED VERSION)
   */
  exportCourseHtml() {
    console.log("=== EXPORTING COURSE HTML ===");

    // Get course data in the correct format
    const chunks = this.stateManager.getState("chunks") || [];
    const courseConfig = this.stateManager.getState("courseConfig");

    console.log("Chunks found:", chunks.length);
    console.log(
      "Chunks with content:",
      chunks.filter((c) => c.generatedContent).length
    );

    // Filter to only chunks with generated content
    const chunksWithContent = chunks.filter((chunk) => chunk.generatedContent);

    if (chunksWithContent.length === 0) {
      StatusManager.showError(
        "No generated content to export. Please generate some slides first."
      );
      return;
    }

    // FIXED: Convert chunks to the format expected by slideRenderer (keep generatedContent property)
    const courseData = {
      course: {
        title: courseConfig.title || "Course Title",
        targetAudience: courseConfig.targetAudience || "",
        estimatedDuration: courseConfig.estimatedDuration || "",
        learningObjectives: courseConfig.learningObjectives || [],
      },
      slides: chunksWithContent.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        slideType: chunk.slideType,
        order: chunk.order,
        generatedContent: chunk.generatedContent, // FIXED: Keep as generatedContent (was content)
        estimatedTime: chunk.estimatedTime,
        isLocked: chunk.isLocked,
        lastGenerated: chunk.lastGenerated,
      })),
      exportedAt: new Date().toISOString(),
      stats: {
        totalSlides: chunksWithContent.length,
        generatedSlides: chunksWithContent.length,
      },
    };

    console.log("Course data for export:", courseData);
    console.log(
      "Sample slide generatedContent:",
      courseData.slides[0]?.generatedContent
    );

    // Create HTML exporter and generate HTML
    const htmlExporter = new HTMLExporter();
    const htmlContent = htmlExporter.generateCourseHtml(courseData);

    // Download the file
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `course-${timestamp}.html`;

    FileProcessor.downloadAsFile(htmlContent, filename, "text/html");
    StatusManager.showSuccess("Course exported as HTML");

    console.log("=== HTML EXPORT COMPLETE ===");
  }

  /**
   * Validate input form and update UI
   */
  validateInputForm() {
    const config = this.stateManager.getState("courseConfig");
    const files = config.uploadedFiles || [];
    const contentFiles = files.filter((file) => file.type === "content");

    const validation = {
      hasTitle:
        config.title &&
        config.title.trim().length >= CONFIG.VALIDATION.COURSE_TITLE.MIN_LENGTH,
      hasObjectives:
        config.learningObjectives &&
        config.learningObjectives.length >=
          CONFIG.VALIDATION.LEARNING_OBJECTIVES.MIN_COUNT,
      hasContent: contentFiles.length > 0,
    };

    const isValid = Object.values(validation).every(Boolean);

    const proceedBtn = this.safeGetElement("proceedToChunkingBtn");
    if (proceedBtn) {
      proceedBtn.disabled = !isValid;
    }

    this.tabManager.updateTabAvailability();
  }

  /**
   * Populate form inputs from current state
   */
  populateFormFromState() {
    const config = this.stateManager.getState("courseConfig");

    const elements = {
      courseTitle: config.title || "",
      estimatedDuration: config.estimatedDuration || "",
      targetAudience: config.targetAudience || "",
      learningObjectives: (config.learningObjectives || []).join("\n"),
      additionalGuidance: config.additionalGuidance || "",
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = this.safeGetElement(id);
      if (element) {
        element.value = value;
      }
    });

    this.validateInputForm();
  }

  /**
   * Restore UI state from saved data
   */
  restoreUIFromState() {
    this.populateFormFromState();
    this.tabManager.updateTabAvailability();

    // ADDED: Force update of uploaded files UI
    if (this.fileUploadController) {
      console.log("Forcing file upload UI update on state restore");
      this.fileUploadController.updateUploadedFilesUI();
    }

    const currentTab = this.stateManager.getState("currentTab");
    if (currentTab && this.tabManager.isTabEnabled(currentTab)) {
      this.tabManager.switchTab(currentTab);
    }
  }

  /**
   * Update processing UI
   */
  updateProcessingUI(isProcessing) {
    const processingStep = this.stateManager.getState("processingStep");

    const buttonIds = [
      "proceedToChunkingBtn",
      "rechunkBtn",
      "addChunkBtn",
      "proceedToGenerationBtn",
      "exportJsonBtn",
      "exportHtmlBtn",
      "generateAllBtn", // ADDED: Include generate all button
    ];

    buttonIds.forEach((buttonId) => {
      const button = this.safeGetElement(buttonId);
      if (button) {
        button.disabled = isProcessing;
        button.classList.toggle("loading", isProcessing);
      }
    });

    if (isProcessing && processingStep) {
      StatusManager.showLoading(processingStep);
    } else if (!isProcessing) {
      StatusManager.hide();
    }
  }

  /**
   * Check if there is unsaved work
   */
  hasUnsavedWork() {
    const config = this.stateManager.getState("courseConfig");
    const chunks = this.stateManager.getState("chunks");
    const slides = this.stateManager.getState("generatedSlides");

    return (
      (config.title && config.title.trim()) ||
      (config.uploadedFiles && config.uploadedFiles.length > 0) ||
      (chunks && chunks.length > 0) ||
      (slides && slides.length > 0)
    );
  }

  /**
   * Set up auto-save indicator
   */
  setupAutoSaveIndicator() {
    this.stateManager.subscribe("lastSaved", (timestamp) => {
      if (timestamp && CONFIG.DEBUG.LOG_LEVEL === "debug") {
        const timeAgo = this.getTimeAgo(new Date(timestamp));
        console.log(`Auto-saved ${timeAgo}`);
      }
    });
  }

  /**
   * Initialize form validation
   */
  initializeFormValidation() {
    const inputs = ["courseTitle", "learningObjectives"];

    inputs.forEach((inputId) => {
      const input = this.safeGetElement(inputId);
      if (input) {
        const handler = () => this.validateField(inputId, input.value);
        input.addEventListener("blur", handler);
        this.eventHandlers.set(`${inputId}-validation`, {
          element: input,
          event: "blur",
          handler,
        });
      }
    });
  }

  /**
   * Validate individual form field
   */
  validateField(fieldId, value) {
    let isValid = true;
    let message = "";

    switch (fieldId) {
      case "courseTitle":
        if (
          !value ||
          value.trim().length < CONFIG.VALIDATION.COURSE_TITLE.MIN_LENGTH
        ) {
          isValid = false;
          message = `Title must be at least ${CONFIG.VALIDATION.COURSE_TITLE.MIN_LENGTH} characters`;
        } else if (value.length > CONFIG.VALIDATION.COURSE_TITLE.MAX_LENGTH) {
          isValid = false;
          message = `Title must be less than ${CONFIG.VALIDATION.COURSE_TITLE.MAX_LENGTH} characters`;
        }
        break;

      case "learningObjectives":
        const objectives = value.split("\n").filter((obj) => obj.trim());
        if (
          objectives.length < CONFIG.VALIDATION.LEARNING_OBJECTIVES.MIN_COUNT
        ) {
          isValid = false;
          message = `At least ${CONFIG.VALIDATION.LEARNING_OBJECTIVES.MIN_COUNT} learning objective is required`;
        }
        break;
    }

    this.showFieldValidation(fieldId, isValid, message);
  }

  /**
   * Show field validation feedback
   */
  showFieldValidation(fieldId, isValid, message) {
    const field = this.safeGetElement(fieldId);
    if (!field) return;

    field.classList.remove("invalid", "valid");
    field.classList.add(isValid ? "valid" : "invalid");

    const existingMessage = field.parentNode.querySelector(
      ".validation-message"
    );
    if (existingMessage) {
      existingMessage.remove();
    }

    if (!isValid && message) {
      const messageDiv = document.createElement("div");
      messageDiv.className = "validation-message";
      messageDiv.textContent = message;
      messageDiv.style.cssText =
        "color: #ef4444; font-size: 0.875rem; margin-top: 0.25rem;";
      field.parentNode.appendChild(messageDiv);
    }
  }

  /**
   * Safe DOM element getter
   */
  safeGetElement(id, required = false) {
    if (this.cachedElements.has(id)) {
      return this.cachedElements.get(id);
    }

    const element = document.getElementById(id);

    if (!element && required) {
      console.error(`Required element not found: ${id}`);
      throw new Error(`Required DOM element missing: ${id}`);
    }

    if (!element) {
      console.warn(`Element not found: ${id}`);
    } else {
      this.cachedElements.set(id, element);
    }

    return element;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  /**
   * Handle application errors
   */
  handleError(error, context = "Application") {
    console.error(`${context} Error:`, error);
    StatusManager.showError(
      `${context}: ${error.message || "An unexpected error occurred"}`
    );
    this.stateManager.addError(error.message, "application");

    if (CONFIG.DEBUG.ENABLED) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        context: context,
      });
    }
  }

  /**
   * Set up debug console (development only)
   */
  setupDebugConsole() {
    window.courseForgeDebug = {
      app: this,
      state: this.stateManager,
      events: this.eventSystem,
      tabs: this.tabManager,
      config: CONFIG,
      getState: (path) => this.stateManager.getState(path),
      setState: (path, value) => this.stateManager.setState(path, value),
      emit: (event, data) => this.eventSystem.emit(event, data),
      clearState: () => this.stateManager.clearState(),
      exportState: () =>
        JSON.stringify(this.stateManager.exportCourseData(), null, 2),
      // Add controller debugging
      controllers: {
        fileUpload: this.fileUploadController,
        coursePreview: this.coursePreviewController,
        chunkUI: this.chunkUIController,
        generationUI: this.generationUIController,
      },
      // FIXED: Add status manager debugging
      statusManager: {
        isShowing: StatusManager.isShowing(),
        isProcessingBatch: StatusManager.isProcessingBatch(),
        currentBatchId: StatusManager.getCurrentBatchId(),
        queueLength: StatusManager.getQueueLength(),
        debugInfo: StatusManager.getDebugInfo(),
      },
    };

    console.log("🚀 Course Forge Debug Console Available");
    console.log("Use window.courseForgeDebug to access debug helpers");
  }

  /**
   * Enhanced cleanup with proper resource management
   */
  cleanup() {
    console.log("Starting application cleanup...");

    // Clear all event handlers
    this.eventHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // Remove window event listeners
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    window.removeEventListener("error", this.errorHandler);
    window.removeEventListener("unhandledrejection", this.rejectionHandler);
    window.removeEventListener("online", this.onlineHandler);
    window.removeEventListener("offline", this.offlineHandler);

    // Cleanup controllers
    if (this.fileUploadController) this.fileUploadController.cleanup();
    if (this.coursePreviewController) this.coursePreviewController.cleanup();
    if (this.chunkUIController) this.chunkUIController.cleanup();
    if (this.generationUIController) this.generationUIController.cleanup();

    // Cleanup managers
    if (this.eventSystem) this.eventSystem.removeAllListeners();
    if (this.tabManager) this.tabManager.cleanup();
    if (this.chunkManager) this.chunkManager.cleanup();
    if (this.contentGenerator) this.contentGenerator.cleanup();

    // Clear timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];

    // Save final state
    if (this.stateManager) {
      this.stateManager.saveState();
    }

    // Clear caches and references
    this.cachedElements.clear();
    window.app = null;
    window.courseForgeDebug = null;

    // Clear global controller references
    window.fileUploadController = null;
    window.coursePreviewController = null;
    window.chunkUIController = null;
    window.generationUIController = null;

    console.log("Application cleanup complete");
  }

  /**
   * Reset application to initial state
   */
  reset() {
    const hasWork = this.hasUnsavedWork();
    if (hasWork) {
      const confirmed = confirm("This will clear all your work. Are you sure?");
      if (!confirmed) return;
    }

    this.stateManager.clearState();
    this.populateFormFromState();
    this.tabManager.switchTab("input");

    const fileInputs = ["fileInput", "courseFileInput"];
    fileInputs.forEach((inputId) => {
      const input = this.safeGetElement(inputId);
      if (input) input.value = "";
    });

    StatusManager.showSuccess("Application reset successfully");
  }
}

// Global app instance
let app;

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  try {
    app = new CourseForgeApp();
    window.app = app;

    // Ensure all controllers are accessible globally after initialization
    setTimeout(() => {
      if (!window.fileUploadController && app.fileUploadController) {
        window.fileUploadController = app.fileUploadController;
        console.log("Manually assigned fileUploadController to global scope");
      }
    }, 100);
  } catch (error) {
    console.error("Failed to initialize CourseForgeApp:", error);
    StatusManager.showError(
      "Failed to initialize application. Please refresh the page."
    );
  }
});

// Handle unhandled errors
window.addEventListener("error", (event) => {
  if (app && app.handleError) {
    app.handleError(event.error, "Unhandled");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (app && app.handleError) {
    app.handleError(new Error(event.reason), "Promise Rejection");
  }
  event.preventDefault();
});
