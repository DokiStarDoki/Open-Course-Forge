/**
 * Course Forge MVP - Main Application Controller
 * Initializes and coordinates all application components
 */

class CourseForgeApp {
  constructor() {
    // Core systems
    this.stateManager = new StateManager();
    this.eventSystem = new EventSystem();
    this.tabManager = new TabManager(this.stateManager, this.eventSystem);

    // Component initialization (async)
    this.initializeComponents()
      .then(() => {
        this.setupEventListeners();
        this.setupFileUpload();
        this.restoreUIFromState();

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
   * Initialize application components
   */
  async initializeComponents() {
    // Initialize file processor browser support check
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

    // Initialize LLM Service
    try {
      this.llmService = new LLMService();
      await this.llmService.initializeAPI();
    } catch (error) {
      console.error("Failed to initialize LLM Service:", error);
      StatusManager.showWarning(
        "AI features may not work properly. Check your API configuration."
      );
    }

    // Initialize Chunk Manager
    this.chunkManager = new ChunkManager(
      this.stateManager,
      this.eventSystem,
      this.llmService
    );

    // Set up auto-save indicator
    this.setupAutoSaveIndicator();

    // Initialize form validation
    this.initializeFormValidation();
  }

  /**
   * Set up main event listeners
   */
  setupEventListeners() {
    // Navigation button events
    this.setupNavigationEvents();

    // Form input events
    this.setupFormEvents();

    // File handling events
    this.setupFileEvents();

    // State change reactions
    this.setupStateReactions();

    // Window events
    this.setupWindowEvents();
  }

  /**
   * Set up navigation button events
   */
  setupNavigationEvents() {
    // Proceed to chunking
    document
      .getElementById("proceedToChunkingBtn")
      ?.addEventListener("click", () => {
        this.proceedToChunking();
      });

    // Back to input
    document.getElementById("backToInputBtn")?.addEventListener("click", () => {
      this.tabManager.switchTab("input");
    });

    // Proceed to generation
    document
      .getElementById("proceedToGenerationBtn")
      ?.addEventListener("click", () => {
        this.tabManager.switchTab("generation");
      });

    // Back to chunking
    document
      .getElementById("backToChunkingBtn")
      ?.addEventListener("click", () => {
        this.tabManager.switchTab("chunking");
      });

    // Chunking actions
    document.getElementById("rechunkBtn")?.addEventListener("click", () => {
      this.rechunkContent();
    });

    document.getElementById("addChunkBtn")?.addEventListener("click", () => {
      this.addNewChunk();
    });

    // Export actions
    document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
      this.exportCourseJson();
    });

    document.getElementById("exportHtmlBtn")?.addEventListener("click", () => {
      this.exportCourseHtml();
    });

    document
      .getElementById("previewCourseBtn")
      ?.addEventListener("click", () => {
        this.previewCourse();
      });
  }

  /**
   * Set up form input events
   */
  setupFormEvents() {
    // Course title
    document.getElementById("courseTitle")?.addEventListener("input", (e) => {
      this.stateManager.setState("courseConfig.title", e.target.value);
    });

    // Estimated duration
    document
      .getElementById("estimatedDuration")
      ?.addEventListener("input", (e) => {
        this.stateManager.setState(
          "courseConfig.estimatedDuration",
          e.target.value
        );
      });

    // Target audience
    document
      .getElementById("targetAudience")
      ?.addEventListener("input", (e) => {
        this.stateManager.setState(
          "courseConfig.targetAudience",
          e.target.value
        );
      });

    // Learning objectives
    document
      .getElementById("learningObjectives")
      ?.addEventListener("input", (e) => {
        const objectives = e.target.value
          .split("\n")
          .filter((obj) => obj.trim());
        this.stateManager.setState(
          "courseConfig.learningObjectives",
          objectives
        );
      });

    // Additional guidance
    document
      .getElementById("additionalGuidance")
      ?.addEventListener("input", (e) => {
        this.stateManager.setState(
          "courseConfig.additionalGuidance",
          e.target.value
        );
      });
  }

  /**
   * Set up file handling events
   */
  setupFileEvents() {
    // Load existing course
    document.getElementById("loadCourseBtn")?.addEventListener("click", () => {
      document.getElementById("courseFileInput")?.click();
    });

    document
      .getElementById("courseFileInput")
      ?.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.loadExistingCourse(e.target.files[0]);
        }
      });
  }

  /**
   * Set up file upload functionality
   */
  setupFileUpload() {
    const uploadArea = document.getElementById("fileUploadArea");
    const fileInput = document.getElementById("fileInput");

    if (!uploadArea || !fileInput) {
      console.warn("File upload elements not found");
      return;
    }

    // Click to upload
    uploadArea.addEventListener("click", () => {
      fileInput.click();
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag and drop events
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });

    // Prevent default drag behaviors on document
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  /**
   * Set up state change reactions
   */
  setupStateReactions() {
    // React to uploaded files changes
    this.stateManager.subscribe("courseConfig.uploadedFiles", () => {
      this.updateUploadedFilesUI();
      this.combineSourceContent();
      this.validateInputForm();
    });

    // React to course config changes
    this.stateManager.subscribe("courseConfig", () => {
      this.validateInputForm();
    });

    // React to chunks changes
    this.stateManager.subscribe("chunks", () => {
      this.updateChunksUI();
    });

    // React to processing state changes
    this.stateManager.subscribe("isProcessing", (isProcessing) => {
      this.updateProcessingUI(isProcessing);
    });
  }

  /**
   * Set up window events
   */
  setupWindowEvents() {
    // Prevent accidental navigation away
    window.addEventListener("beforeunload", (e) => {
      const hasUnsavedWork = this.hasUnsavedWork();
      if (hasUnsavedWork) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved work. Are you sure you want to leave?";
        return e.returnValue;
      }
    });

    // Handle browser back/forward
    window.addEventListener("popstate", (e) => {
      // Handle browser navigation if needed
    });

    // Handle online/offline status
    window.addEventListener("online", () => {
      StatusManager.showSuccess("Connection restored");
    });

    window.addEventListener("offline", () => {
      StatusManager.showWarning(
        "You are offline. Your work will be saved locally."
      );
    });
  }

  /**
   * Handle file uploads
   * @param {FileList} files - Files to process
   */
  async handleFiles(files) {
    const fileArray = Array.from(files);
    const uploadedFiles =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    StatusManager.showLoading(`Processing ${fileArray.length} file(s)...`);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const progress = ((i + 1) / fileArray.length) * 100;

        StatusManager.showProgress(`Processing ${file.name}`, progress);

        try {
          const processedFile = await FileProcessor.processFile(file);

          // Add unique ID and timestamp
          const fileData = {
            ...processedFile,
            id: Date.now() + Math.random(),
            uploadedAt: new Date().toISOString(),
          };

          uploadedFiles.push(fileData);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          StatusManager.showError(
            `Failed to process ${file.name}: ${error.message}`
          );
        }
      }

      // Update state with all processed files
      this.stateManager.setState("courseConfig.uploadedFiles", uploadedFiles);

      StatusManager.showSuccess(
        `Successfully processed ${fileArray.length} file(s)`
      );
    } catch (error) {
      console.error("File processing error:", error);
      StatusManager.showError("Error processing files");
    } finally {
      StatusManager.hide();
    }
  }

  /**
   * Update uploaded files UI
   */
  updateUploadedFilesUI() {
    const container = document.getElementById("uploadedFiles");
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    if (!container) return;

    if (files.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = files
      .map(
        (file) => `
            <div class="uploaded-file">
                <div class="file-info">
                    <i data-lucide="${FileProcessor.getFileTypeIcon(
                      file.filename
                    )}"></i>
                    <div>
                        <div class="file-name">${file.filename}</div>
                        <div class="file-size">
                            ${FileProcessor.formatFileSize(file.size)} • ${
          file.type
        }
                            ${
                              file.wordCount ? ` • ${file.wordCount} words` : ""
                            }
                        </div>
                    </div>
                </div>
                <button class="remove-file" onclick="app.removeFile('${
                  file.id
                }')" title="Remove file">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `
      )
      .join("");

    // Reinitialize icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  /**
   * Remove an uploaded file
   * @param {string} fileId - ID of file to remove
   */
  removeFile(fileId) {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];
    const updatedFiles = files.filter((file) => file.id !== fileId);
    this.stateManager.setState("courseConfig.uploadedFiles", updatedFiles);

    StatusManager.showInfo("File removed");
  }

  /**
   * Combine source content from uploaded files
   */
  combineSourceContent() {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];
    const contentFiles = files.filter((file) => file.type === "content");

    if (contentFiles.length === 0) {
      this.stateManager.setState("courseConfig.sourceContent", "");
      return;
    }

    const combinedContent = contentFiles
      .map((file) => `=== ${file.filename} ===\n${file.content}`)
      .join("\n\n");

    this.stateManager.setState("courseConfig.sourceContent", combinedContent);
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

    // Update proceed button
    const proceedBtn = document.getElementById("proceedToChunkingBtn");
    if (proceedBtn) {
      proceedBtn.disabled = !isValid;
    }

    // Update tab availability
    this.tabManager.updateTabAvailability();

    // Show validation feedback
    if (config.title && !validation.hasTitle) {
      // Could show inline validation messages here
    }
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

    // Validate course config
    if (!this.tabManager.validateCourseConfig(courseConfig)) {
      StatusManager.showError("Please complete the course configuration first");
      return;
    }

    // Confirm if chunks already exist
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

    // Use chunk manager to generate chunks
    await this.chunkManager.generateChunks(courseConfig);
  }

  /**
   * Add a new chunk manually
   */
  addNewChunk() {
    if (!this.chunkManager) {
      StatusManager.showError("Chunk manager not initialized");
      return;
    }

    this.chunkManager.addNewChunk();
  }

  /**
   * Update chunks UI
   */
  updateChunksUI() {
    const container = document.getElementById("chunksContainer");
    const chunks = this.stateManager.getState("chunks") || [];

    if (!container) return;

    if (chunks.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="layout" class="empty-icon"></i>
                    <p>No chunks generated yet. Click "Rechunk Content" to begin.</p>
                </div>
            `;
    } else {
      container.innerHTML = `
                <div class="chunks-container" id="chunksListContainer">
                    ${chunks
                      .map((chunk) => this.renderChunkItem(chunk))
                      .join("")}
                </div>
            `;

      // Setup drag and drop for reordering
      if (this.chunkManager) {
        const chunksListContainer = document.getElementById(
          "chunksListContainer"
        );
        this.chunkManager.setupDragAndDrop(chunksListContainer);
      }
    }

    // Update proceed button
    const proceedBtn = document.getElementById("proceedToGenerationBtn");
    if (proceedBtn) {
      proceedBtn.disabled = chunks.length === 0;
    }

    // Reinitialize icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  /**
   * Render a chunk item
   * @param {Object} chunk - Chunk data
   * @returns {string} HTML for chunk item
   */
  renderChunkItem(chunk) {
    const slideTypeOptions = CONFIG.SLIDE_TYPES.map(
      (type) =>
        `<option value="${type.value}" ${
          chunk.slideType === type.value ? "selected" : ""
        }>${type.label}</option>`
    ).join("");

    return `
            <div class="chunk-item ${chunk.isLocked ? "locked" : ""}" 
                 data-chunk-id="${chunk.id}" 
                 draggable="true">
                <div class="chunk-header">
                    <div class="chunk-drag-handle">
                        <i data-lucide="grip-vertical"></i>
                    </div>
                    <div class="chunk-title-container">
                        <input type="text" 
                               class="chunk-title-input" 
                               value="${chunk.title}" 
                               onchange="app.updateChunkTitle('${
                                 chunk.id
                               }', this.value)"
                               ${chunk.isLocked ? "readonly" : ""}>
                        <div class="chunk-meta">
                            <span class="chunk-time">${
                              chunk.estimatedTime || "2 min"
                            }</span>
                            <span class="chunk-status ${
                              chunk.generatedContent ? "generated" : "pending"
                            }">
                                ${
                                  chunk.generatedContent
                                    ? "Generated"
                                    : "Pending"
                                }
                            </span>
                        </div>
                    </div>
                    <div class="chunk-controls">
                        <button class="btn btn-secondary btn-sm" 
                                onclick="app.toggleChunkLock('${chunk.id}')" 
                                title="${
                                  chunk.isLocked ? "Unlock" : "Lock"
                                } chunk">
                            <i data-lucide="${
                              chunk.isLocked ? "lock" : "unlock"
                            }"></i>
                        </button>
                        <select class="form-select chunk-type-select" 
                                onchange="app.changeChunkType('${
                                  chunk.id
                                }', this.value)"
                                ${chunk.isLocked ? "disabled" : ""}>
                            ${slideTypeOptions}
                        </select>
                        <button class="btn btn-primary btn-sm" 
                                onclick="app.editChunk('${chunk.id}')" 
                                title="Edit chunk content">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" 
                                onclick="app.removeChunk('${chunk.id}')" 
                                title="Remove chunk">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                ${
                  chunk.sourceContent
                    ? `
                    <div class="chunk-content-preview">
                        <small class="chunk-content-text">${chunk.sourceContent.substring(
                          0,
                          150
                        )}${
                        chunk.sourceContent.length > 150 ? "..." : ""
                      }</small>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  /**
   * Update chunk title
   */
  updateChunkTitle(chunkId, newTitle) {
    if (!this.chunkManager) return;
    this.chunkManager.updateChunkTitle(chunkId, newTitle);
  }

  /**
   * Edit chunk content
   */
  editChunk(chunkId) {
    // For now, just show info - will be implemented in Phase 3
    StatusManager.showInfo(
      "Chunk editing will be available in Phase 3 - Content Generation"
    );
  }

  /**
   * Toggle chunk lock status
   * @param {string} chunkId - Chunk ID
   */
  toggleChunkLock(chunkId) {
    if (!this.chunkManager) return;
    this.chunkManager.toggleChunkLock(chunkId);
  }

  /**
   * Change chunk slide type
   * @param {string} chunkId - Chunk ID
   * @param {string} newType - New slide type
   */
  changeChunkType(chunkId, newType) {
    if (!this.chunkManager) return;
    this.chunkManager.changeChunkType(chunkId, newType);
  }

  /**
   * Remove a chunk
   * @param {string} chunkId - Chunk ID
   */
  removeChunk(chunkId) {
    if (!this.chunkManager) return;
    this.chunkManager.removeChunk(chunkId);
  }

  /**
   * Export course as JSON
   */
  exportCourseJson() {
    const courseData = this.stateManager.exportCourseData();
    const jsonString = JSON.stringify(courseData, null, 2);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `course-${timestamp}.json`;

    FileProcessor.downloadAsFile(jsonString, filename, "application/json");
    StatusManager.showSuccess("Course exported as JSON");
  }

  /**
   * Export course as HTML
   */
  exportCourseHtml() {
    StatusManager.showInfo("HTML export will be implemented in Phase 3");
    // TODO: Implement HTML export in Phase 3
  }

  /**
   * Preview course
   */
  previewCourse() {
    StatusManager.showInfo("Course preview will be implemented in Phase 3");
    // TODO: Implement course preview in Phase 3
  }

  /**
   * Load existing course from file
   * @param {File} file - Course file to load
   */
  async loadExistingCourse(file) {
    try {
      StatusManager.showLoading("Loading course...");

      const processedFile = await FileProcessor.processFile(file);

      if (processedFile.type !== "course") {
        throw new Error("Invalid course file format");
      }

      const success = this.stateManager.loadFromCourseData(processedFile.data);

      if (success) {
        this.populateFormFromState();
        StatusManager.showSuccess(`Course loaded: ${file.name}`);
      } else {
        throw new Error("Failed to load course data");
      }
    } catch (error) {
      console.error("Error loading course:", error);
      StatusManager.showError(`Error loading course: ${error.message}`);
    } finally {
      StatusManager.hide();
    }
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
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
      }
    });

    // Update UI components
    this.updateUploadedFilesUI();
    this.updateChunksUI();
    this.validateInputForm();
  }

  /**
   * Restore UI state from saved data
   */
  restoreUIFromState() {
    this.populateFormFromState();
    this.tabManager.updateTabAvailability();

    // Restore tab if user was on a different tab
    const currentTab = this.stateManager.getState("currentTab");
    if (currentTab && this.tabManager.isTabEnabled(currentTab)) {
      this.tabManager.switchTab(currentTab);
    }
  }

  /**
   * Update processing UI
   * @param {boolean} isProcessing - Whether processing is active
   */
  updateProcessingUI(isProcessing) {
    const processingStep = this.stateManager.getState("processingStep");

    // Disable/enable relevant buttons
    const buttons = [
      "proceedToChunkingBtn",
      "rechunkBtn",
      "addChunkBtn",
      "proceedToGenerationBtn",
      "exportJsonBtn",
      "exportHtmlBtn",
    ];

    buttons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.disabled = isProcessing;

        if (isProcessing) {
          button.classList.add("loading");
        } else {
          button.classList.remove("loading");
        }
      }
    });

    // Show processing status
    if (isProcessing && processingStep) {
      StatusManager.showLoading(processingStep);
    } else if (!isProcessing) {
      StatusManager.hide();
    }
  }

  /**
   * Check if there is unsaved work
   * @returns {boolean} True if there is unsaved work
   */
  hasUnsavedWork() {
    const config = this.stateManager.getState("courseConfig");
    const chunks = this.stateManager.getState("chunks");
    const slides = this.stateManager.getState("generatedSlides");

    // Check if user has entered data
    const hasData =
      (config.title && config.title.trim()) ||
      (config.uploadedFiles && config.uploadedFiles.length > 0) ||
      (chunks && chunks.length > 0) ||
      (slides && slides.length > 0);

    return hasData;
  }

  /**
   * Set up auto-save indicator
   */
  setupAutoSaveIndicator() {
    // Show auto-save status
    this.stateManager.subscribe("lastSaved", (timestamp) => {
      if (timestamp) {
        const timeAgo = this.getTimeAgo(new Date(timestamp));
        // Could show "Auto-saved X minutes ago" indicator
        if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
          console.log(`Auto-saved ${timeAgo}`);
        }
      }
    });
  }

  /**
   * Initialize form validation
   */
  initializeFormValidation() {
    // Add real-time validation feedback
    const inputs = ["courseTitle", "learningObjectives"];

    inputs.forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener("blur", () => {
          this.validateField(inputId, input.value);
        });
      }
    });
  }

  /**
   * Validate individual form field
   * @param {string} fieldId - Field ID
   * @param {string} value - Field value
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
   * @param {string} fieldId - Field ID
   * @param {boolean} isValid - Whether field is valid
   * @param {string} message - Validation message
   */
  showFieldValidation(fieldId, isValid, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Remove existing validation classes
    field.classList.remove("invalid", "valid");

    // Remove existing validation message
    const existingMessage = field.parentNode.querySelector(
      ".validation-message"
    );
    if (existingMessage) {
      existingMessage.remove();
    }

    // Add validation class
    field.classList.add(isValid ? "valid" : "invalid");

    // Show validation message if invalid
    if (!isValid && message) {
      const messageDiv = document.createElement("div");
      messageDiv.className = "validation-message";
      messageDiv.textContent = message;
      messageDiv.style.cssText = `
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 0.25rem;
            `;
      field.parentNode.appendChild(messageDiv);
    }
  }

  /**
   * Get time ago string
   * @param {Date} date - Date to compare
   * @returns {string} Time ago string
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
   * Set up debug console (development only)
   */
  setupDebugConsole() {
    // Add global debug helpers
    window.courseForgeDebug = {
      app: this,
      state: this.stateManager,
      events: this.eventSystem,
      tabs: this.tabManager,
      config: CONFIG,

      // Helper functions
      getState: (path) => this.stateManager.getState(path),
      setState: (path, value) => this.stateManager.setState(path, value),
      emit: (event, data) => this.eventSystem.emit(event, data),
      clearState: () => this.stateManager.clearState(),

      // Status helpers
      showSuccess: (msg) => StatusManager.showSuccess(msg),
      showError: (msg) => StatusManager.showError(msg),
      showInfo: (msg) => StatusManager.showInfo(msg),

      // Export helpers
      exportState: () =>
        JSON.stringify(this.stateManager.exportCourseData(), null, 2),
      importState: (data) =>
        this.stateManager.loadFromCourseData(JSON.parse(data)),
    };

    console.log("🚀 Course Forge Debug Console Available");
    console.log("Use window.courseForgeDebug to access debug helpers");
    console.log("Examples:");
    console.log('  courseForgeDebug.getState("courseConfig")');
    console.log('  courseForgeDebug.setState("currentTab", "chunking")');
    console.log("  courseForgeDebug.exportState()");
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   */
  handleError(error, context = "Application") {
    console.error(`${context} Error:`, error);

    const errorMessage = error.message || "An unexpected error occurred";
    StatusManager.showError(`${context}: ${errorMessage}`);

    // Add to state errors
    this.stateManager.addError(errorMessage, "application");

    // In debug mode, show more details
    if (CONFIG.DEBUG.ENABLED) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        context: context,
        state: this.stateManager.getState(),
      });
    }
  }

  /**
   * Cleanup application resources
   */
  cleanup() {
    // Remove event listeners
    this.eventSystem.removeAllListeners();

    // Clear any timeouts
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Save final state
    this.stateManager.saveState();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("CourseForgeApp cleaned up");
    }
  }

  /**
   * Reset application to initial state
   */
  reset() {
    // Confirm with user
    const hasWork = this.hasUnsavedWork();
    if (hasWork) {
      const confirmed = confirm("This will clear all your work. Are you sure?");
      if (!confirmed) return;
    }

    // Clear state
    this.stateManager.clearState();

    // Reset UI
    this.populateFormFromState();
    this.tabManager.switchTab("input");

    // Clear file inputs
    const fileInputs = ["fileInput", "courseFileInput"];
    fileInputs.forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) input.value = "";
    });

    StatusManager.showSuccess("Application reset successfully");
  }

  /**
   * Get application statistics
   * @returns {Object} Application statistics
   */
  getStats() {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];
    const chunks = this.stateManager.getState("chunks") || [];
    const slides = this.stateManager.getState("generatedSlides") || [];

    return {
      filesUploaded: files.length,
      totalFileSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
      totalWords: files.reduce((sum, file) => sum + (file.wordCount || 0), 0),
      chunksCreated: chunks.length,
      slidesGenerated: slides.length,
      currentTab: this.stateManager.getState("currentTab"),
      hasUnsavedWork: this.hasUnsavedWork(),
      lastSaved: this.stateManager.getState("lastSaved"),
    };
  }
}

// Global app instance
let app;

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  try {
    app = new CourseForgeApp();

    // Make app globally available for onclick handlers
    window.app = app;
  } catch (error) {
    console.error("Failed to initialize CourseForgeApp:", error);
    StatusManager.showError(
      "Failed to initialize application. Please refresh the page."
    );
  }
});

// Handle unhandled errors
window.addEventListener("error", (event) => {
  if (app) {
    app.handleError(event.error, "Unhandled");
  } else {
    console.error("Unhandled error before app initialization:", event.error);
  }
});

// Handle unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  if (app) {
    app.handleError(new Error(event.reason), "Promise Rejection");
  } else {
    console.error(
      "Unhandled promise rejection before app initialization:",
      event.reason
    );
  }

  // Prevent default browser handling
  event.preventDefault();
});
