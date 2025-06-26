/**
 * Course Forge MVP - File Upload Controller (FIXED JSON LOADING)
 * Handles all file upload functionality and UI management
 */

class FileUploadController {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.eventHandlers = new Map();

    // ADDED: Track processing state to prevent race conditions
    this.isProcessingFiles = false;
    this.processingStartTime = null;

    this.setupFileUpload();
    this.setupEventListeners();

    // FIX: Assign to global variable immediately upon construction
    window.fileUploadController = this;

    if (CONFIG.DEBUG.ENABLED) {
      console.log("FileUploadController initialized and assigned globally");
    }
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
    const clickHandler = () => fileInput.click();
    uploadArea.addEventListener("click", clickHandler);
    this.eventHandlers.set("uploadArea-click", {
      element: uploadArea,
      event: "click",
      handler: clickHandler,
    });

    // File input change
    const changeHandler = (e) => this.handleFiles(e.target.files);
    fileInput.addEventListener("change", changeHandler);
    this.eventHandlers.set("fileInput-change", {
      element: fileInput,
      event: "change",
      handler: changeHandler,
    });

    // Drag and drop events
    const dragOverHandler = (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    };

    const dragLeaveHandler = (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
    };

    const dropHandler = (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    };

    uploadArea.addEventListener("dragover", dragOverHandler);
    uploadArea.addEventListener("dragleave", dragLeaveHandler);
    uploadArea.addEventListener("drop", dropHandler);

    this.eventHandlers.set("uploadArea-dragover", {
      element: uploadArea,
      event: "dragover",
      handler: dragOverHandler,
    });
    this.eventHandlers.set("uploadArea-dragleave", {
      element: uploadArea,
      event: "dragleave",
      handler: dragLeaveHandler,
    });
    this.eventHandlers.set("uploadArea-drop", {
      element: uploadArea,
      event: "drop",
      handler: dropHandler,
    });

    // Prevent default drag behaviors on document
    this.dragPreventDefault = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, this.dragPreventDefault);
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // React to uploaded files changes - ENHANCED to always update UI
    this.stateManager.subscribe("courseConfig.uploadedFiles", (files) => {
      console.log(
        "Files state changed, updating UI:",
        files?.length || 0,
        "files"
      );
      this.updateUploadedFilesUI();
      this.combineSourceContent();
    });

    // FIXED: Course file loading with proper event handler
    const courseFileInput = document.getElementById("courseFileInput");
    if (courseFileInput) {
      const handler = (e) => {
        console.log(
          "Course file input changed:",
          e.target.files.length,
          "files"
        );
        if (e.target.files.length > 0) {
          this.loadCourseFromFile(e.target.files[0]);
          // Clear the input so the same file can be loaded again
          e.target.value = "";
        }
      };
      courseFileInput.addEventListener("change", handler);
      this.eventHandlers.set("courseFileInput-change", {
        element: courseFileInput,
        event: "change",
        handler,
      });

      console.log("Course file input event listener attached");
    } else {
      console.warn("courseFileInput element not found");
    }

    // ADDED: Update UI when component initializes
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      this.updateUploadedFilesUI();
    }, 100);
  }

  /**
   * Handle file uploads with FIXED race condition prevention
   */
  async handleFiles(files) {
    const fileArray = Array.from(files);
    const uploadedFiles =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    // FIXED: Prevent overlapping file processing
    if (this.isProcessingFiles) {
      console.warn("File processing already in progress, ignoring new request");
      return;
    }

    this.isProcessingFiles = true;
    this.processingStartTime = Date.now();

    const results = {
      successful: [],
      failed: [],
      skipped: [],
    };

    // FIXED: Clear any existing status messages first
    StatusManager.clearQueue();
    StatusManager.hide();

    // Small delay to ensure status is cleared before starting
    await this.delay(50);

    // FIXED: Start with initial loading message
    StatusManager.showLoading(`Processing ${fileArray.length} file(s)...`);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const progress = ((i + 1) / fileArray.length) * 100;

        try {
          // Check for duplicates
          const existingFile = uploadedFiles.find(
            (f) => f.filename === file.name && f.size === file.size
          );

          if (existingFile) {
            results.skipped.push({
              filename: file.name,
              reason: "File already uploaded",
            });
            continue;
          }

          // FIXED: Only show progress for slow files or multiple files
          const processingTime = Date.now() - this.processingStartTime;
          if (processingTime > 200 || fileArray.length > 1) {
            StatusManager.showProgress(`Processing ${file.name}`, progress);
          }

          const processedFile = await FileProcessor.processFile(file);

          // FIXED: Handle course files properly
          if (processedFile.type === "course") {
            // If it's a course file, load it instead of adding to uploaded files
            await this.loadCourseFromProcessedFile(processedFile);
            results.successful.push({
              ...processedFile,
              action: "loaded_as_course",
            });
          } else {
            // Add metadata for content files
            const fileData = {
              ...processedFile,
              id: `file-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              uploadedAt: new Date().toISOString(),
            };

            uploadedFiles.push(fileData);
            results.successful.push(fileData);
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          results.failed.push({
            filename: file.name,
            error: error.message,
          });
        }
      }

      // Update state with content files only (course files are handled separately)
      const contentFiles = uploadedFiles.filter((f) => f.type === "content");
      this.stateManager.setState("courseConfig.uploadedFiles", contentFiles);

      // FIXED: Ensure clean status transition
      await this.showProcessingResultsWithCleanTransition(results);
    } catch (error) {
      console.error("File processing error:", error);
      StatusManager.clearQueue();
      StatusManager.hide();
      await this.delay(50);
      StatusManager.showError("Critical error during file processing");
    } finally {
      // FIXED: Always clean up processing state
      this.isProcessingFiles = false;
      this.processingStartTime = null;
    }
  }

  /**
   * FIXED: Show processing results with clean status transition
   */
  async showProcessingResultsWithCleanTransition(results) {
    // FIXED: Clear everything first and wait for animations
    StatusManager.clearQueue();
    StatusManager.hide();

    // Wait for hide animation to complete
    await this.delay(CONFIG.UI.ANIMATION_DURATION + 50);

    const messages = [];

    if (results.successful.length > 0) {
      const courseLoaded = results.successful.some(
        (f) => f.action === "loaded_as_course"
      );
      if (courseLoaded) {
        messages.push("✅ Course loaded successfully");
      } else {
        messages.push(
          `✅ ${results.successful.length} files processed successfully`
        );
      }
    }
    if (results.failed.length > 0) {
      messages.push(`❌ ${results.failed.length} files failed`);
    }
    if (results.skipped.length > 0) {
      messages.push(`⏭️ ${results.skipped.length} files skipped (duplicates)`);
    }

    // FIXED: Show final result with proper timing
    if (results.successful.length > 0) {
      StatusManager.showSuccess(messages.join(", "));
    } else if (results.failed.length > 0) {
      StatusManager.showError(
        `File processing failed: ${results.failed[0].error}`
      );
    } else {
      StatusManager.showInfo("No new files to process");
    }

    // Log detailed errors if any
    if (results.failed.length > 0) {
      console.warn("File processing errors:", results.failed);
    }
  }

  /**
   * ADDED: Utility delay function
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update uploaded files UI
   */
  updateUploadedFilesUI() {
    const container = document.getElementById("uploadedFiles");
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    console.log("Updating uploaded files UI:", files.length, "files");

    if (!container) {
      console.warn("uploadedFiles container not found");
      return;
    }

    if (files.length === 0) {
      console.log("No files to display, clearing container");
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }

    console.log("Rendering", files.length, "files");
    container.style.display = "block";
    container.innerHTML = files
      .map((file) => this.renderFileItem(file))
      .join("");

    // Reinitialize icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    console.log("UI updated with", files.length, "files displayed");
  }

  /**
   * Render individual file item with SAFE onclick handler
   */
  renderFileItem(file) {
    return `
      <div class="uploaded-file" data-file-id="${file.id}">
        <div class="file-info">
          <i data-lucide="${FileProcessor.getFileTypeIcon(file.filename)}"></i>
          <div>
            <div class="file-name">${this.escapeHtml(file.filename)}</div>
            <div class="file-size">
              ${FileProcessor.formatFileSize(file.size)} • ${file.type}
              ${file.wordCount ? ` • ${file.wordCount} words` : ""}
            </div>
          </div>
        </div>
        <button class="remove-file" 
                onclick="FileUploadController.safeRemoveFile('${file.id}')" 
                title="Remove file">
          <i data-lucide="x"></i>
        </button>
      </div>
    `;
  }

  /**
   * STATIC method for safe file removal (called from HTML)
   */
  static safeRemoveFile(fileId) {
    try {
      if (
        window.fileUploadController &&
        typeof window.fileUploadController.removeFile === "function"
      ) {
        window.fileUploadController.removeFile(fileId);
      } else {
        console.error("FileUploadController not properly initialized");
        StatusManager.showError("File removal failed - controller not ready");

        // Try to reinitialize if possible
        if (window.app && window.app.fileUploadController) {
          window.fileUploadController = window.app.fileUploadController;
          window.fileUploadController.removeFile(fileId);
        }
      }
    } catch (error) {
      console.error("Error removing file:", error);
      StatusManager.showError(`Failed to remove file: ${error.message}`);
    }
  }

  /**
   * Remove an uploaded file (ENHANCED with better error handling)
   */
  removeFile(fileId) {
    try {
      console.log("Attempting to remove file:", fileId);

      const files =
        this.stateManager.getState("courseConfig.uploadedFiles") || [];

      console.log("Current files before removal:", files.length);

      const fileIndex = files.findIndex((file) => file.id === fileId);

      if (fileIndex === -1) {
        console.warn(`File with ID ${fileId} not found`);
        StatusManager.showWarning("File not found");
        return;
      }

      const removedFile = files[fileIndex];
      const updatedFiles = files.filter((file) => file.id !== fileId);

      console.log("Files after filtering:", updatedFiles.length);

      // Update state - this should trigger the UI update via subscription
      this.stateManager.setState("courseConfig.uploadedFiles", updatedFiles);

      console.log("State updated, new file count:", updatedFiles.length);

      StatusManager.showSuccess(`"${removedFile.filename}" removed`);

      this.eventSystem.emit("file:removed", {
        fileId,
        filename: removedFile.filename,
      });

      // FORCE UI update in case subscription doesn't work
      setTimeout(() => {
        console.log("Force updating UI after file removal");
        this.updateUploadedFilesUI();
      }, 50);
    } catch (error) {
      console.error("Error in removeFile:", error);
      StatusManager.showError(`Failed to remove file: ${error.message}`);
    }
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

    this.eventSystem.emit("content:combined", {
      fileCount: contentFiles.length,
      totalWords: contentFiles.reduce(
        (sum, file) => sum + (file.wordCount || 0),
        0
      ),
    });
  }

  /**
   * FIXED: Load course from file with proper error handling and status management
   */
  async loadCourseFromFile(file) {
    console.log("Loading course from file:", file.name);

    try {
      StatusManager.clearQueue();
      StatusManager.hide();
      await this.delay(50);

      StatusManager.showLoading(`Loading course from ${file.name}...`);

      const processedFile = await FileProcessor.processFile(file);
      await this.loadCourseFromProcessedFile(processedFile);
    } catch (error) {
      console.error("Error loading course from file:", error);
      StatusManager.hide();
      await this.delay(50);
      StatusManager.showError(`Error loading course: ${error.message}`);
      this.eventSystem.emit("course:load-failed", {
        error: error.message,
        filename: file.name,
      });
    }
  }

  /**
   * FIXED: Load course from processed file data
   */
  async loadCourseFromProcessedFile(processedFile) {
    console.log("Loading course from processed file:", processedFile);

    if (processedFile.type !== "course") {
      throw new Error("Invalid course file format - expected course data");
    }

    if (!processedFile.data) {
      throw new Error("No course data found in file");
    }

    // Validate course data structure
    if (!this.validateCourseData(processedFile.data)) {
      throw new Error("Invalid course data structure");
    }

    console.log("Course data validation passed, loading into state...");

    const success = this.stateManager.loadFromCourseData(processedFile.data);

    if (success) {
      StatusManager.hide();
      await this.delay(50);
      StatusManager.showSuccess(`Course loaded: ${processedFile.filename}`);

      this.eventSystem.emit("course:loaded", {
        filename: processedFile.filename,
        courseTitle:
          processedFile.data.courseConfig?.title || "Untitled Course",
      });

      // Force UI updates
      this.updateUploadedFilesUI();

      // Trigger form population
      if (window.app && window.app.populateFormFromState) {
        window.app.populateFormFromState();
      }

      console.log("Course loaded successfully");
    } else {
      throw new Error("Failed to load course data into application state");
    }
  }

  /**
   * ADDED: Validate course data structure
   */
  validateCourseData(data) {
    if (!data || typeof data !== "object") {
      console.error("Course data is not an object:", data);
      return false;
    }

    // Check for required properties
    const requiredKeys = ["courseConfig"];
    for (const key of requiredKeys) {
      if (!data[key]) {
        console.error(`Missing required course data key: ${key}`);
        return false;
      }
    }

    // Validate courseConfig structure
    if (!data.courseConfig.title) {
      console.error("Course config missing title");
      return false;
    }

    console.log("Course data validation passed");
    return true;
  }

  /**
   * FIXED: Trigger course file selection (this is the method called by the Load Course button)
   */
  triggerCourseLoad() {
    console.log("Triggering course load file picker...");
    const courseFileInput = document.getElementById("courseFileInput");
    if (courseFileInput) {
      courseFileInput.click();
      console.log("Course file input clicked");
    } else {
      console.error("courseFileInput element not found");
      StatusManager.showError("Course file input not found");
    }
  }

  /**
   * DEPRECATED: Legacy method name - kept for backward compatibility
   */
  loadExistingCourse() {
    console.log("loadExistingCourse called - delegating to triggerCourseLoad");
    this.triggerCourseLoad();
  }

  /**
   * Clear all uploaded files
   */
  clearAllFiles() {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    if (files.length === 0) {
      return;
    }

    const confirmed = confirm(`Remove all ${files.length} uploaded files?`);
    if (confirmed) {
      this.stateManager.setState("courseConfig.uploadedFiles", []);
      StatusManager.showSuccess("All files removed");
      this.eventSystem.emit("files:cleared");
      this.updateUploadedFilesUI();
    }
  }

  /**
   * Get upload statistics
   */
  getUploadStats() {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    return {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
      totalWords: files.reduce((sum, file) => sum + (file.wordCount || 0), 0),
      fileTypes: files.reduce((acc, file) => {
        const ext = FileProcessor.getFileExtension(file.filename);
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {}),
      contentFiles: files.filter((f) => f.type === "content").length,
      courseFiles: files.filter((f) => f.type === "course").length,
    };
  }

  /**
   * Validate uploaded files
   */
  validateFiles() {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];
    const contentFiles = files.filter((f) => f.type === "content");

    const validation = {
      hasFiles: files.length > 0,
      hasContent: contentFiles.length > 0,
      totalWords: contentFiles.reduce(
        (sum, file) => sum + (file.wordCount || 0),
        0
      ),
      isValid: true,
      warnings: [],
      errors: [],
    };

    if (!validation.hasContent) {
      validation.errors.push("No content files uploaded");
      validation.isValid = false;
    }

    if (validation.totalWords < CONFIG.CONTENT.MIN_WORD_COUNT) {
      validation.errors.push(
        `Content too short (${validation.totalWords} words, minimum ${CONFIG.CONTENT.MIN_WORD_COUNT})`
      );
      validation.isValid = false;
    }

    if (validation.totalWords > CONFIG.CONTENT.MAX_WORD_COUNT) {
      validation.warnings.push(
        `Content is very long (${validation.totalWords} words)`
      );
    }

    return validation;
  }

  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Remove all event listeners
    this.eventHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // Remove document-level drag prevention
    if (this.dragPreventDefault) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        document.removeEventListener(eventName, this.dragPreventDefault);
      });
    }

    // Clear global reference
    window.fileUploadController = null;

    console.log("FileUploadController cleaned up");
  }
}

// ENHANCED: Make both instance and static methods available globally
window.FileUploadController = FileUploadController;
window.fileUploadController = null; // Will be set by constructor

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // This will be set by the main app, but we ensure it's available
  if (
    !window.fileUploadController &&
    window.app &&
    window.app.fileUploadController
  ) {
    window.fileUploadController = window.app.fileUploadController;
  }
});
