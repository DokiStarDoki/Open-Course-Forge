/**
 * Course Forge MVP - Main Application with Real AI Integration and Interactive Slides
 * Single-screen course creation interface with learning science principles
 */

class CourseForgeApp {
  constructor() {
    // Core systems
    this.stateManager = new StateManager();
    this.eventSystem = new EventSystem();
    this.llmService = new SimpleLLMService();
    this.slideComponents = new SlideComponents();

    // UI state
    this.draggedChunk = null;
    this.draggedIndex = null;
    this.autoSaveTimeout = null;

    // Don't initialize immediately - wait for DOM
  }

  async init() {
    try {
      // Ensure DOM is ready before proceeding
      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve, {
            once: true,
          });
        });
      }

      // Setup event listeners
      this.setupEventListeners();

      // Wait for LLM service to be ready
      try {
        await this.llmService.ensureReady();
        StatusManager.showSuccess("AI service connected successfully!");

        // Show service health info
        const health = await this.llmService.getHealthCheck();
        if (CONFIG.DEBUG.ENABLED) {
          console.log("LLM Service Health:", health);
        }
      } catch (error) {
        console.error("LLM service initialization failed:", error);
        StatusManager.showError(
          "AI service connection failed: " + error.message
        );
      }

      // Setup slide components integration
      this.setupSlideComponentsIntegration();

      // Restore UI from state
      this.populateFormFromState();
      this.updateProgress();
      this.renderChunks();

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Course Forge initialized successfully");
      }
    } catch (error) {
      console.error("Failed to initialize Course Forge:", error);
      StatusManager.showError(
        "Failed to initialize application: " + error.message
      );
    }
  }

  setupSlideComponentsIntegration() {
    // Integrate slide components with the main app
    this.slideComponents.app = this;

    // Set up content update handlers
    this.slideComponents.updateContent = (chunkId, field, value) => {
      this.updateSlideContent(chunkId, field, value);
    };

    this.slideComponents.updateBullet = (chunkId, index, value) => {
      this.updateSlideBullet(chunkId, index, value);
    };

    this.slideComponents.addBullet = (chunkId) => {
      this.addSlideBullet(chunkId);
    };

    this.slideComponents.deleteBullet = (chunkId, index) => {
      this.deleteSlideBullet(chunkId, index);
    };

    this.slideComponents.updateCard = (chunkId, index, side, value) => {
      this.updateSlideCard(chunkId, index, side, value);
    };

    this.slideComponents.addCard = (chunkId) => {
      this.addSlideCard(chunkId);
    };

    this.slideComponents.deleteCard = (chunkId, index) => {
      this.deleteSlideCard(chunkId, index);
    };

    this.slideComponents.updateTab = (chunkId, index, field, value) => {
      this.updateSlideTab(chunkId, index, field, value);
    };

    this.slideComponents.addTab = (chunkId) => {
      this.addSlideTab(chunkId);
    };

    this.slideComponents.deleteTab = (chunkId, index) => {
      this.deleteSlideTab(chunkId, index);
    };

    this.slideComponents.updateIcon = (chunkId, index, field, value) => {
      this.updateSlideIcon(chunkId, index, field, value);
    };

    this.slideComponents.addIcon = (chunkId) => {
      this.addSlideIcon(chunkId);
    };

    this.slideComponents.deleteIcon = (chunkId, index) => {
      this.deleteSlideIcon(chunkId, index);
    };

    this.slideComponents.updateFAQItem = (chunkId, index, field, value) => {
      this.updateSlideFAQItem(chunkId, index, field, value);
    };

    this.slideComponents.addFAQItem = (chunkId) => {
      this.addSlideFAQItem(chunkId);
    };

    this.slideComponents.deleteFAQItem = (chunkId, index) => {
      this.deleteSlideFAQItem(chunkId, index);
    };

    this.slideComponents.updatePopup = (chunkId, index, field, value) => {
      this.updateSlidePopup(chunkId, index, field, value);
    };

    this.slideComponents.addPopup = (chunkId) => {
      this.addSlidePopup(chunkId);
    };

    this.slideComponents.deletePopup = (chunkId, index) => {
      this.deleteSlidePopup(chunkId, index);
    };

    this.slideComponents.updateOption = (chunkId, index, value) => {
      this.updateSlideOption(chunkId, index, value);
    };

    this.slideComponents.addOption = (chunkId) => {
      this.addSlideOption(chunkId);
    };

    this.slideComponents.deleteOption = (chunkId, index) => {
      this.deleteSlideOption(chunkId, index);
    };

    this.slideComponents.setCorrectAnswer = (chunkId, index) => {
      this.setSlideCorrectAnswer(chunkId, index);
    };

    this.slideComponents.updateFeedback = (chunkId, type, value) => {
      this.updateSlideFeedback(chunkId, type, value);
    };

    this.slideComponents.updateObjective = (chunkId, index, value) => {
      this.updateSlideObjective(chunkId, index, value);
    };

    this.slideComponents.addObjective = (chunkId) => {
      this.addSlideObjective(chunkId);
    };

    this.slideComponents.updateGenericContent = (chunkId, value) => {
      this.updateSlideGenericContent(chunkId, value);
    };

    this.slideComponents.regenerateContent = (chunkId) => {
      this.generateChunkContent(chunkId);
    };

    this.slideComponents.duplicateSlide = (chunkId) => {
      this.duplicateChunk(chunkId);
    };

    this.slideComponents.previewSlide = (chunkId) => {
      this.previewSingleSlide(chunkId);
    };

    this.slideComponents.generateContent = (chunkId) => {
      this.generateChunkContent(chunkId);
    };
  }

  setupEventListeners() {
    // Info drawer toggle
    document.getElementById("collapse-btn").addEventListener("click", () => {
      this.toggleDrawer();
    });

    // Form inputs with auto-save
    this.setupFormInputs();

    // File upload
    this.setupFileUpload();

    // Action buttons
    this.setupActionButtons();

    // Auto-save on any input
    document.addEventListener("input", (e) => {
      if (e.target.matches("input, textarea")) {
        this.scheduleAutoSave();
      }
    });
  }

  setupFormInputs() {
    const inputs = [
      { id: "course-title", path: "courseConfig.title" },
      { id: "course-duration", path: "courseConfig.estimatedDuration" },
      { id: "target-audience", path: "courseConfig.targetAudience" },
      { id: "ai-guidance", path: "courseConfig.additionalGuidance" },
    ];

    inputs.forEach(({ id, path }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("input", (e) => {
          this.stateManager.setState(path, e.target.value);
          if (path === "courseConfig.title") {
            this.updateProgress();
          }
        });
      }
    });

    // Special handling for learning objectives
    const objectivesEl = document.getElementById("learning-objectives");
    if (objectivesEl) {
      objectivesEl.addEventListener("input", (e) => {
        const objectives = e.target.value
          .split("\n")
          .filter((obj) => obj.trim())
          .map((obj) => obj.trim());
        this.stateManager.setState(
          "courseConfig.learningObjectives",
          objectives
        );
      });
    }
  }

  setupFileUpload() {
    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("file-input");

    uploadArea.addEventListener("click", () => fileInput.click());

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

    fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });
  }

  setupActionButtons() {
    const buttons = [
      { id: "load-course-btn", handler: () => this.loadCourse() },
      { id: "generate-chunks-btn", handler: () => this.generateChunks() },
      { id: "rechunk-btn", handler: () => this.rechunkWithFeedback() },
      { id: "generate-all-btn", handler: () => this.generateAllContent() },
      { id: "add-chunk-btn", handler: () => this.addChunk() },
      { id: "preview-course-btn", handler: () => this.previewCourse() },
      { id: "export-json-btn", handler: () => this.exportJSON() },
      { id: "export-html-btn", handler: () => this.exportHTML() },
    ];

    buttons.forEach(({ id, handler }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("click", handler);
      }
    });
  }

  toggleDrawer() {
    const drawer = document.getElementById("info-drawer");
    drawer.classList.toggle("collapsed");

    const btn = document.getElementById("collapse-btn");
    btn.textContent = drawer.classList.contains("collapsed") ? "→" : "←";
  }

  populateFormFromState() {
    const config = this.stateManager.getState("courseConfig");

    const formFields = [
      { id: "course-title", value: config.title || "" },
      {
        id: "course-duration",
        value: config.estimatedDuration || "45 minutes",
      },
      {
        id: "target-audience",
        value: config.targetAudience || "business professionals",
      },
      {
        id: "learning-objectives",
        value: (config.learningObjectives || []).join("\n"),
      },
      { id: "ai-guidance", value: config.additionalGuidance || "" },
    ];

    formFields.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
      }
    });

    this.updateUploadedFilesUI();
  }

  async handleFiles(files) {
    if (files.length === 0) return;

    try {
      StatusManager.showLoading("Processing files...");

      const processedFiles = await FileProcessor.processMultipleFiles(files);
      const currentFiles =
        this.stateManager.getState("courseConfig.uploadedFiles") || [];

      // Add new files
      const newFiles = [...currentFiles, ...processedFiles];
      this.stateManager.setState("courseConfig.uploadedFiles", newFiles);

      // Update source content
      const newContent = processedFiles
        .filter((file) => file.processed && !file.error)
        .map((file) => file.content)
        .join("\n\n");

      const currentContent =
        this.stateManager.getState("courseConfig.sourceContent") || "";
      const updatedContent = currentContent
        ? `${currentContent}\n\n${newContent}`
        : newContent;
      this.stateManager.setState("courseConfig.sourceContent", updatedContent);

      this.updateUploadedFilesUI();

      const successCount = processedFiles.filter((f) => f.processed).length;
      const errorCount = processedFiles.filter((f) => f.error).length;

      if (successCount > 0) {
        StatusManager.showSuccess(`Added ${successCount} file(s) successfully`);
      }
      if (errorCount > 0) {
        StatusManager.showWarning(`${errorCount} file(s) had errors`);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      StatusManager.showError("Error processing files: " + error.message);
    }
  }

  updateUploadedFilesUI() {
    const container = document.getElementById("uploaded-files");
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];

    container.innerHTML = "";

    files.forEach((file, index) => {
      const fileItem = document.createElement("div");
      fileItem.className = "uploaded-file";
      fileItem.innerHTML = `
        <div class="file-info">
          <div class="file-name">${this.escapeHtml(file.name)}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
          ${
            file.error
              ? `<div class="text-danger">Error: ${this.escapeHtml(
                  file.error
                )}</div>`
              : ""
          }
        </div>
        <button class="remove-btn" onclick="courseForge.removeFile(${index})" title="Remove file">×</button>
      `;
      container.appendChild(fileItem);
    });
  }

  removeFile(index) {
    const files =
      this.stateManager.getState("courseConfig.uploadedFiles") || [];
    files.splice(index, 1);
    this.stateManager.setState("courseConfig.uploadedFiles", files);

    // Update source content
    const remainingContent = files
      .filter((file) => file.processed && !file.error)
      .map((file) => file.content)
      .join("\n\n");
    this.stateManager.setState("courseConfig.sourceContent", remainingContent);

    this.updateUploadedFilesUI();
    StatusManager.showSuccess("File removed");
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  updateProgress() {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunksWithSourceContent = chunks.filter(
      (chunk) => chunk.sourceContent && chunk.sourceContent.trim().length > 50
    );
    const chunksWithSlideContent = chunks.filter(
      (chunk) => chunk.generatedContent
    );

    document.getElementById("total-chunks").textContent = chunks.length;
    document.getElementById("chunks-with-content").textContent =
      chunksWithSourceContent.length;
    document.getElementById("generated-slides").textContent =
      chunksWithSlideContent.length;
  }

  async generateChunks() {
    const config = this.stateManager.getState("courseConfig");

    // Validate configuration
    const validation = this.llmService.validateCourseConfig(config);
    if (!validation.valid) {
      StatusManager.showError(validation.errors.join("; "));
      return;
    }

    try {
      // Start batch processing to show progress
      if (typeof StatusManager.startBatch === "function") {
        StatusManager.startBatch("chunk-generation");
      } else {
        StatusManager.showLoading("Generating chunks with AI...");
      }

      // Use real AI to generate chunks with three-pass workflow
      const chunks = await this.llmService.generateChunks(config);

      this.stateManager.setState("chunks", chunks);
      this.renderChunks();
      this.updateProgress();

      // Show learning science insights
      const insights = this.analyzeLearningScience(chunks);

      if (typeof StatusManager.endBatch === "function") {
        StatusManager.endBatch(
          `Generated ${chunks.length} chunks with learning science optimization!`
        );
      } else {
        StatusManager.showSuccess(
          `Generated ${chunks.length} chunks with learning science optimization!`
        );
      }

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Learning Science Analysis:", insights);
      }
    } catch (error) {
      console.error("Error generating chunks:", error);

      if (typeof StatusManager.endBatch === "function") {
        StatusManager.endBatch(
          `Error generating chunks: ${error.message}`,
          "error"
        );
      } else {
        StatusManager.showError("Error generating chunks: " + error.message);
      }
    }
  }

  analyzeLearningScience(chunks) {
    const bloomsDistribution = {};
    const cognitiveLoadDistribution = {};
    let assessmentCount = 0;

    chunks.forEach((chunk) => {
      // Bloom's taxonomy analysis
      const blooms = chunk.bloomsLevel || "understand";
      bloomsDistribution[blooms] = (bloomsDistribution[blooms] || 0) + 1;

      // Cognitive load analysis
      const load = chunk.cognitiveLoad || "medium";
      cognitiveLoadDistribution[load] =
        (cognitiveLoadDistribution[load] || 0) + 1;

      // Assessment analysis
      if (chunk.assessmentType && chunk.assessmentType !== "none") {
        assessmentCount++;
      }
    });

    return {
      bloomsDistribution,
      cognitiveLoadDistribution,
      assessmentCount,
      totalChunks: chunks.length,
      hasProgression: this.checkBloomsProgression(chunks),
    };
  }

  checkBloomsProgression(chunks) {
    const bloomsOrder = [
      "remember",
      "understand",
      "apply",
      "analyze",
      "evaluate",
      "create",
    ];
    const chunkLevels = chunks.map(
      (chunk) => chunk.bloomsLevel || "understand"
    );

    // Check if there's generally increasing complexity
    let hasProgression = false;
    for (let i = 0; i < chunkLevels.length - 1; i++) {
      const currentIndex = bloomsOrder.indexOf(chunkLevels[i]);
      const nextIndex = bloomsOrder.indexOf(chunkLevels[i + 1]);
      if (nextIndex > currentIndex) {
        hasProgression = true;
        break;
      }
    }

    return hasProgression;
  }

  async rechunkWithFeedback() {
    const chunks = this.stateManager.getState("chunks") || [];
    if (chunks.length === 0) {
      StatusManager.showError(
        "No chunks to rechunk. Generate initial chunks first."
      );
      return;
    }

    const confirmed = confirm(
      "This will regenerate all chunks using AI. Continue?"
    );
    if (!confirmed) return;

    await this.generateChunks();
  }

  async generateAllContent() {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunksWithoutContent = chunks.filter(
      (chunk) => !chunk.generatedContent
    );

    if (chunksWithoutContent.length === 0) {
      StatusManager.showInfo("All chunks already have generated content");
      return;
    }

    try {
      StatusManager.showLoading(
        `Generating AI content for ${chunksWithoutContent.length} chunks...`
      );

      const config = this.stateManager.getState("courseConfig");

      for (let i = 0; i < chunksWithoutContent.length; i++) {
        const chunk = chunksWithoutContent[i];
        StatusManager.update(
          `Generating AI content for "${chunk.title}" (${i + 1}/${
            chunksWithoutContent.length
          })`
        );

        // Generate new slide content using real AI
        const content = await this.llmService.generateSlideContent(
          chunk,
          config
        );
        chunk.generatedContent = content;
        chunk.lastGenerated = new Date().toISOString();
      }

      this.stateManager.setState("chunks", chunks);
      this.renderChunks();
      this.updateProgress();

      StatusManager.showSuccess(
        `Generated AI content for ${chunksWithoutContent.length} chunks!`
      );
    } catch (error) {
      console.error("Error generating content:", error);
      StatusManager.showError("Error generating content: " + error.message);
    }
  }

  async generateChunkContent(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    try {
      StatusManager.showLoading(
        `Generating AI content for "${chunk.title}"...`
      );

      const config = this.stateManager.getState("courseConfig");
      const content = await this.llmService.generateSlideContent(chunk, config);

      chunk.generatedContent = content;
      chunk.lastGenerated = new Date().toISOString();

      this.stateManager.setState("chunks", chunks);
      this.renderChunks();
      this.updateProgress();

      StatusManager.showSuccess(`Generated AI content for "${chunk.title}"`);
    } catch (error) {
      console.error("Error generating chunk content:", error);
      StatusManager.showError("Error generating content: " + error.message);
    }
  }

  addChunk() {
    const chunks = this.stateManager.getState("chunks") || [];
    const newChunk = {
      id: `chunk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: `New Chunk ${chunks.length + 1}`,
      slideType: "textAndBullets",
      sourceContent: "",
      groundTruth: "",
      estimatedTime: "3 minutes",
      order: chunks.length,
      isLocked: false,
      generatedContent: null,
      createdAt: new Date().toISOString(),
      // Learning science metadata
      bloomsLevel: "understand",
      learningObjectiveAlignment: [],
      cognitiveLoad: "medium",
      reinforcementStrategy: "",
      assessmentType: "none",
      interactionLevel: "active",
    };

    chunks.push(newChunk);
    this.stateManager.setState("chunks", chunks);

    this.renderChunks();
    this.updateProgress();

    StatusManager.showSuccess("New chunk added");
  }

  duplicateChunk(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    const duplicate = {
      ...chunk,
      id: `chunk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: chunk.title + " (Copy)",
      order: chunks.length,
      isLocked: false,
      generatedContent: chunk.generatedContent
        ? { ...chunk.generatedContent }
        : null,
      createdAt: new Date().toISOString(),
    };

    chunks.push(duplicate);
    this.stateManager.setState("chunks", chunks);

    this.renderChunks();
    this.updateProgress();

    StatusManager.showSuccess("Chunk duplicated");
  }

  removeChunk(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const index = chunks.findIndex((c) => c.id === chunkId);

    if (index === -1) {
      StatusManager.showError("Chunk not found");
      return;
    }

    const chunk = chunks[index];
    if (chunk.generatedContent || chunk.isLocked) {
      const confirmed = confirm(
        "This chunk has content. Are you sure you want to delete it?"
      );
      if (!confirmed) return;
    }

    chunks.splice(index, 1);

    // Reorder remaining chunks
    chunks.forEach((chunk, i) => {
      chunk.order = i;
    });

    this.stateManager.setState("chunks", chunks);

    this.renderChunks();
    this.updateProgress();

    StatusManager.showSuccess("Chunk removed");
  }

  toggleChunkLock(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    chunk.isLocked = !chunk.isLocked;
    this.stateManager.setState("chunks", chunks);

    this.renderChunks();

    StatusManager.showSuccess(
      chunk.isLocked ? "Chunk locked" : "Chunk unlocked"
    );
  }

  updateChunkTitle(chunkId, title) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) return;

    chunk.title = title.trim();
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  updateChunkGuidance(chunkId, guidance) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) return;

    chunk.groundTruth = guidance.trim();
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  updateChunkContent(chunkId, content) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) return;

    chunk.sourceContent = content.trim();
    this.stateManager.setState("chunks", chunks);
    this.updateProgress();
    this.scheduleAutoSave();
  }

  updateChunkSlideType(chunkId, slideType) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) return;

    chunk.slideType = slideType;

    // Clear generated content when changing slide type
    if (chunk.generatedContent) {
      chunk.generatedContent = null;
      StatusManager.showInfo(
        "Generated content cleared due to slide type change"
      );
    }

    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  // NEW: Slide content update methods
  updateSlideContent(chunkId, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    chunk.generatedContent[field] = value;
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Updated slide content: ${chunkId}.${field} = ${value}`);
    }
  }

  updateSlideBullet(chunkId, index, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.bullets)
      return;

    chunk.generatedContent.bullets[index] = value;
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  addSlideBullet(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!chunk.generatedContent.bullets) {
      chunk.generatedContent.bullets = [];
    }

    chunk.generatedContent.bullets.push("New bullet point");
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlideBullet(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.bullets)
      return;

    chunk.generatedContent.bullets.splice(index, 1);
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlideCard(chunkId, index, side, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (
      !chunk ||
      !chunk.generatedContent ||
      !Array.isArray(chunk.generatedContent)
    )
      return;

    if (chunk.generatedContent[index]) {
      chunk.generatedContent[index][side] = value;
      this.stateManager.setState("chunks", chunks);
      this.scheduleAutoSave();
    }
  }

  addSlideCard(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!Array.isArray(chunk.generatedContent)) {
      chunk.generatedContent = [];
    }

    chunk.generatedContent.push({
      front: "New card front",
      back: "New card back",
    });
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlideCard(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (
      !chunk ||
      !chunk.generatedContent ||
      !Array.isArray(chunk.generatedContent)
    )
      return;

    chunk.generatedContent.splice(index, 1);
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlideTab(chunkId, index, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (
      !chunk ||
      !chunk.generatedContent ||
      !Array.isArray(chunk.generatedContent)
    )
      return;

    if (chunk.generatedContent[index]) {
      chunk.generatedContent[index][field] = value;
      this.stateManager.setState("chunks", chunks);
      this.scheduleAutoSave();
    }
  }

  addSlideTab(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!Array.isArray(chunk.generatedContent)) {
      chunk.generatedContent = [];
    }

    chunk.generatedContent.push({
      title: "New Tab",
      content: "New tab content",
    });
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlideTab(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (
      !chunk ||
      !chunk.generatedContent ||
      !Array.isArray(chunk.generatedContent)
    )
      return;

    chunk.generatedContent.splice(index, 1);
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlideIcon(chunkId, index, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.icons)
      return;

    if (chunk.generatedContent.icons[index]) {
      chunk.generatedContent.icons[index][field] = value;
      this.stateManager.setState("chunks", chunks);
      this.scheduleAutoSave();
    }
  }

  addSlideIcon(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!chunk.generatedContent.icons) {
      chunk.generatedContent.icons = [];
    }

    chunk.generatedContent.icons.push({
      icon: "📋",
      title: "New Icon",
      description: "New icon description",
    });
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlideIcon(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.icons)
      return;

    chunk.generatedContent.icons.splice(index, 1);
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlideFAQItem(chunkId, index, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.items)
      return;

    if (chunk.generatedContent.items[index]) {
      chunk.generatedContent.items[index][field] = value;
      this.stateManager.setState("chunks", chunks);
      this.scheduleAutoSave();
    }
  }

  addSlideFAQItem(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!chunk.generatedContent.items) {
      chunk.generatedContent.items = [];
    }

    chunk.generatedContent.items.push({
      question: "New question",
      answer: "New answer",
    });
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlideFAQItem(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.items)
      return;

    chunk.generatedContent.items.splice(index, 1);
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlidePopup(chunkId, index, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (
      !chunk ||
      !chunk.generatedContent ||
      !Array.isArray(chunk.generatedContent)
    )
      return;

    if (chunk.generatedContent[index]) {
      chunk.generatedContent[index][field] = value;
      this.stateManager.setState("chunks", chunks);
      this.scheduleAutoSave();
    }
  }

  addSlidePopup(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!Array.isArray(chunk.generatedContent)) {
      chunk.generatedContent = [];
    }

    chunk.generatedContent.push({
      title: "New Popup",
      content: "New popup content",
    });
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlidePopup(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (
      !chunk ||
      !chunk.generatedContent ||
      !Array.isArray(chunk.generatedContent)
    )
      return;

    chunk.generatedContent.splice(index, 1);
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlideOption(chunkId, index, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.options)
      return;

    chunk.generatedContent.options[index] = value;
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  addSlideOption(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!chunk.generatedContent.options) {
      chunk.generatedContent.options = [];
    }

    chunk.generatedContent.options.push("New option");
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  deleteSlideOption(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.options)
      return;

    chunk.generatedContent.options.splice(index, 1);
    // Adjust correct answer if needed
    if (chunk.generatedContent.correctAnswer >= index) {
      chunk.generatedContent.correctAnswer = Math.max(
        0,
        chunk.generatedContent.correctAnswer - 1
      );
    }
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  setSlideCorrectAnswer(chunkId, index) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    chunk.generatedContent.correctAnswer = index;
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  updateSlideFeedback(chunkId, type, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!chunk.generatedContent.feedback) {
      chunk.generatedContent.feedback = {};
    }

    chunk.generatedContent.feedback[type] = value;
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  updateSlideObjective(chunkId, index, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent || !chunk.generatedContent.objectives)
      return;

    chunk.generatedContent.objectives[index] = value;
    this.stateManager.setState("chunks", chunks);
    this.scheduleAutoSave();
  }

  addSlideObjective(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) return;

    if (!chunk.generatedContent.objectives) {
      chunk.generatedContent.objectives = [];
    }

    chunk.generatedContent.objectives.push("New objective");
    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  updateSlideGenericContent(chunkId, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) return;

    try {
      chunk.generatedContent = JSON.parse(value);
      this.stateManager.setState("chunks", chunks);
      this.scheduleAutoSave();
    } catch (error) {
      console.error("Invalid JSON in generic content:", error);
      StatusManager.showError("Invalid JSON format");
    }
  }

  previewSingleSlide(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk || !chunk.generatedContent) {
      StatusManager.showError("No content to preview");
      return;
    }

    const previewWindow = window.open(
      "",
      "slidePreview",
      "width=800,height=600,scrollbars=yes"
    );

    if (!previewWindow) {
      StatusManager.showError(
        "Popup blocked. Please allow popups for preview."
      );
      return;
    }

    const slideHtml = this.slideComponents.renderSlideComponent(chunk, false);

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preview: ${this.escapeHtml(chunk.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          ${this.getSlideComponentsCSS()}
        </style>
      </head>
      <body>
        ${slideHtml}
        <script>
          // Add slide components functionality
          ${this.getSlideComponentsJS()}
        </script>
      </body>
      </html>
    `);

    previewWindow.document.close();
    previewWindow.focus();
  }

  getSlideComponentsCSS() {
    // Return the CSS from the slide components
    return `
      /* Basic slide styles for preview */
      .slide-component { background: white; padding: 20px; border-radius: 8px; }
      .slide-title { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
      .slide-content { font-size: 16px; line-height: 1.6; }
      .flip-card { perspective: 1000px; width: 250px; height: 200px; margin: 10px; }
      .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
      .flip-card-inner.flipped { transform: rotateY(180deg); }
      .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; padding: 20px; border-radius: 8px; }
      .flip-card-front { background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; }
      .flip-card-back { background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; transform: rotateY(180deg); }
      .tab-headers { display: flex; border-bottom: 2px solid #e0e0e0; }
      .tab-header { padding: 12px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
      .tab-header.active { border-bottom-color: #007bff; }
      .tab-panel { display: none; padding: 20px; }
      .tab-panel.active { display: block; }
    `;
  }

  getSlideComponentsJS() {
    // Return minimal JS for preview functionality
    return `
      function flipCard(chunkId, cardIndex) {
        const card = document.getElementById('flip-card-' + chunkId + '-' + cardIndex);
        if (card) card.classList.toggle('flipped');
      }
      function switchTab(chunkId, tabIndex) {
        const panels = document.querySelectorAll('[id^="tab-' + chunkId + '-"]');
        panels.forEach(p => p.classList.remove('active'));
        const selectedPanel = document.getElementById('tab-' + chunkId + '-' + tabIndex);
        if (selectedPanel) selectedPanel.classList.add('active');
        const headers = document.querySelectorAll('[onclick*="switchTab"]');
        headers.forEach(h => h.classList.remove('active'));
        const selectedHeader = document.querySelector('[onclick*="switchTab(\'' + chunkId + '\', ' + tabIndex + ')"]');
        if (selectedHeader) selectedHeader.classList.add('active');
      }
    `;
  }

  renderChunks() {
    const container = document.getElementById("chunks-container");
    let emptyState = document.getElementById("empty-state");
    const chunks = this.stateManager.getState("chunks") || [];

    if (!container) {
      console.error("chunks-container element not found!");
      return;
    }

    if (chunks.length === 0) {
      // Create empty state if it doesn't exist
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.id = "empty-state";
        emptyState.className = "empty-state";
        emptyState.innerHTML = `
          <h3>No chunks created yet</h3>
          <p>Start by configuring your course settings and generating initial chunks.</p>
        `;
        container.appendChild(emptyState);
      }
      emptyState.style.display = "block";

      // Clear any chunk content but keep the empty state
      const chunkCards = container.querySelectorAll(".chunk-card");
      chunkCards.forEach((card) => card.remove());
      return;
    }

    // Remove empty state when we have chunks
    if (emptyState) {
      emptyState.remove();
    }

    const chunksHTML = chunks
      .sort((a, b) => a.order - b.order)
      .map((chunk, index) => this.renderChunkCard(chunk, index))
      .join("");

    container.innerHTML = chunksHTML;
    this.setupChunkEventListeners();
  }

  renderChunkCard(chunk, index) {
    const slideTypeOptions = CONFIG.SLIDE_TYPES.map(
      (type) =>
        `<option value="${type.value}" ${
          chunk.slideType === type.value ? "selected" : ""
        }>${type.label}</option>`
    ).join("");

    const hasContent = chunk.generatedContent;
    const hasSourceContent =
      chunk.sourceContent && chunk.sourceContent.trim().length > 0;

    // Use the new slide components system for rendering content
    const contentPreview = hasContent
      ? this.slideComponents.renderSlideComponent(chunk, true)
      : '<span class="text-muted">No slide content generated yet</span>';

    // Learning science metadata
    const bloomsLevel = chunk.bloomsLevel || "understand";
    const cognitiveLoad = chunk.cognitiveLoad || "medium";
    const interactionLevel = chunk.interactionLevel || "active";

    return `
      <div class="chunk-card ${chunk.isLocked ? "locked" : ""}" 
           draggable="true" 
           data-chunk-id="${chunk.id}" 
           data-index="${index}">
        <div class="chunk-header">
          <span class="chunk-number ${chunk.isLocked ? "locked" : ""}">${
      index + 1
    }</span>
          <div class="chunk-actions">
            <button onclick="courseForge.toggleChunkLock('${
              chunk.id
            }')" title="${chunk.isLocked ? "Unlock" : "Lock"}">
              ${chunk.isLocked ? "🔒" : "🔓"}
            </button>
            <button onclick="courseForge.duplicateChunk('${
              chunk.id
            }')">Duplicate</button>
            <button onclick="courseForge.generateChunkContent('${
              chunk.id
            }')" class="btn-success">
              Generate Slide Content
            </button>
            <button onclick="courseForge.removeChunk('${
              chunk.id
            }')" class="btn-danger">Delete</button>
          </div>
        </div>

        <!-- Learning Science Metadata -->
        <div class="chunk-metadata">
          <div class="metadata-item">
            <span class="metadata-label">Bloom's:</span>
            <span class="blooms-level blooms-${bloomsLevel}">${bloomsLevel}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Load:</span>
            <span class="cognitive-load load-${cognitiveLoad}">${cognitiveLoad}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Interaction:</span>
            <span class="metadata-value">${interactionLevel}</span>
          </div>
          ${
            chunk.assessmentType && chunk.assessmentType !== "none"
              ? `
          <div class="metadata-item">
            <span class="metadata-label">Assessment:</span>
            <span class="metadata-value">${chunk.assessmentType}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <input type="text" 
               class="chunk-title" 
               value="${this.escapeHtml(chunk.title)}" 
               onchange="courseForge.updateChunkTitle('${
                 chunk.id
               }', this.value)"
               placeholder="Enter chunk title">
        
        <div class="chunk-section">
          <h4>Content Guidance <span class="text-muted">(High-level focus)</span></h4>
          <textarea class="chunk-guidance" 
                    onchange="courseForge.updateChunkGuidance('${
                      chunk.id
                    }', this.value)"
                    placeholder="High-level guidance: What should this section focus on? What are the learning goals?">${this.escapeHtml(
                      chunk.groundTruth || ""
                    )}</textarea>
        </div>
        
        <div class="chunk-section">
          <h4>Source Content <span class="text-muted">(Base content learners will read)</span></h4>
          <textarea class="chunk-content" 
                    onchange="courseForge.updateChunkContent('${
                      chunk.id
                    }', this.value)"
                    placeholder="The detailed content that learners will read. This should be substantial text covering the topic comprehensively.">${this.escapeHtml(
                      chunk.sourceContent || ""
                    )}</textarea>
        </div>
        
        <div class="chunk-section">
          <h4>Slide Type <span class="text-muted">(How content will be presented)</span></h4>
          <select class="slide-type-selector" 
                  onchange="courseForge.updateChunkSlideType('${
                    chunk.id
                  }', this.value)">
            ${slideTypeOptions}
          </select>
        </div>
        
        <div class="chunk-section">
          <h4>Interactive Slide Content <span class="text-muted">(Editable, visual presentation)</span></h4>
          <div class="slide-content-container">
            ${contentPreview}
          </div>
          ${
            !hasContent && hasSourceContent
              ? `<button onclick="courseForge.generateChunkContent('${chunk.id}')" class="btn btn-primary mt-2">Generate AI Slide Content from Source</button>`
              : ""
          }
        </div>
      </div>
    `;
  }

  setupChunkEventListeners() {
    const chunkCards = document.querySelectorAll(".chunk-card");

    chunkCards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        this.draggedChunk = card;
        this.draggedIndex = parseInt(card.dataset.index);
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", card.dataset.index);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        this.draggedChunk = null;
        this.draggedIndex = null;
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        const toIndex = parseInt(card.dataset.index);

        if (fromIndex !== toIndex) {
          this.moveChunk(fromIndex, toIndex);
        }
      });
    });
  }

  moveChunk(fromIndex, toIndex) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.splice(fromIndex, 1)[0];
    chunks.splice(toIndex, 0, chunk);

    // Update order values
    chunks.forEach((chunk, index) => {
      chunk.order = index;
    });

    this.stateManager.setState("chunks", chunks);
    this.renderChunks();
    this.scheduleAutoSave();
  }

  loadCourse() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            this.stateManager.importCourseData(data);
            this.populateFormFromState();
            this.renderChunks();
            this.updateProgress();
            StatusManager.showSuccess("Course loaded successfully!");
          } catch (error) {
            console.error("Error loading course:", error);
            StatusManager.showError("Error loading course: " + error.message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  previewCourse() {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunksWithContent = chunks.filter((chunk) => chunk.generatedContent);

    if (chunksWithContent.length === 0) {
      StatusManager.showError(
        "No generated content to preview. Please generate some slides first."
      );
      return;
    }

    const config = this.stateManager.getState("courseConfig");
    const previewWindow = window.open(
      "",
      "coursePreview",
      "width=1000,height=800,scrollbars=yes"
    );

    if (!previewWindow) {
      StatusManager.showError(
        "Popup blocked. Please allow popups for course preview."
      );
      return;
    }

    const slidesHtml = chunksWithContent
      .map((chunk, index) => {
        const slideHtml = this.slideComponents.renderSlideComponent(
          chunk,
          false
        );
        return `
          <div class="preview-slide" data-slide="${index}">
            <div class="slide-number">Slide ${index + 1}</div>
            ${slideHtml}
          </div>
        `;
      })
      .join("");

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preview: ${this.escapeHtml(config.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .preview-header { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .preview-slide { margin-bottom: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
          .slide-number { background: #007bff; color: white; padding: 10px 20px; font-weight: 600; }
          ${this.getSlideComponentsCSS()}
        </style>
      </head>
      <body>
        <div class="preview-header">
          <h1>${this.escapeHtml(config.title)}</h1>
          <p><strong>Duration:</strong> ${this.escapeHtml(
            config.estimatedDuration
          )}</p>
          <p><strong>Audience:</strong> ${this.escapeHtml(
            config.targetAudience
          )}</p>
        </div>
        
        ${slidesHtml}
        
        <script>
          ${this.getSlideComponentsJS()}
        </script>
      </body>
      </html>
    `);

    previewWindow.document.close();
    previewWindow.focus();

    StatusManager.showSuccess("Course preview opened");
  }

  exportJSON() {
    const courseData = this.stateManager.exportCourseData();
    const jsonString = JSON.stringify(courseData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `course-${timestamp}.json`;

    FileProcessor.downloadAsFile(jsonString, filename, "application/json");
    StatusManager.showSuccess("Course exported as JSON");
  }

  exportHTML() {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunksWithContent = chunks.filter((chunk) => chunk.generatedContent);

    if (chunksWithContent.length === 0) {
      StatusManager.showError(
        "No generated content to export. Please generate some slides first."
      );
      return;
    }

    const config = this.stateManager.getState("courseConfig");
    const htmlContent = this.generateHTMLExport(config, chunksWithContent);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `course-${timestamp}.html`;

    FileProcessor.downloadAsFile(htmlContent, filename, "text/html");
    StatusManager.showSuccess("Course exported as HTML");
  }

  generateHTMLExport(config, chunks) {
    const slidesHtml = chunks
      .map((chunk, index) => {
        const slideHtml = this.slideComponents.renderSlideComponent(
          chunk,
          false
        );
        return `
          <div class="export-slide" data-slide="${index}">
            <div class="slide-header-export">
              <h3>Slide ${index + 1}: ${this.escapeHtml(chunk.title)}</h3>
              <div class="slide-meta">
                <span class="slide-type">${this.getSlideTypeLabel(
                  chunk.slideType
                )}</span>
                <span class="blooms-level blooms-${
                  chunk.bloomsLevel || "understand"
                }">${chunk.bloomsLevel || "understand"}</span>
              </div>
            </div>
            ${slideHtml}
          </div>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(config.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; line-height: 1.6; background: #f5f5f5; }
          .export-header { text-align: center; margin-bottom: 40px; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .export-slide { margin-bottom: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
          .slide-header-export { background: #f8f9fa; padding: 20px; border-bottom: 1px solid #e0e0e0; }
          .slide-header-export h3 { margin: 0; color: #333; }
          .slide-meta { margin-top: 10px; display: flex; gap: 10px; align-items: center; }
          .slide-type { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
          ${this.getSlideComponentsCSS()}
        </style>
      </head>
      <body>
        <div class="export-header">
          <h1>${this.escapeHtml(config.title)}</h1>
          <div class="course-details">
            <p><strong>Duration:</strong> ${this.escapeHtml(
              config.estimatedDuration
            )}</p>
            <p><strong>Target Audience:</strong> ${this.escapeHtml(
              config.targetAudience
            )}</p>
            ${
              config.learningObjectives && config.learningObjectives.length > 0
                ? `
              <div class="objectives">
                <p><strong>Learning Objectives:</strong></p>
                <ul>
                  ${config.learningObjectives
                    .map((obj) => `<li>${this.escapeHtml(obj)}</li>`)
                    .join("")}
                </ul>
              </div>
            `
                : ""
            }
          </div>
        </div>
        
        ${slidesHtml}
        
        <div class="footer">
          <p>Generated by Course Forge MVP with Interactive Slide Components on ${new Date().toLocaleDateString()}</p>
          <p>Total slides: ${chunks.length} | Interactive components: ${
      chunks.filter((c) =>
        ["flipCards", "tabs", "multipleChoice", "faq", "popups"].includes(
          c.slideType
        )
      ).length
    }</p>
        </div>
        
        <script>
          ${this.getSlideComponentsJS()}
        </script>
      </body>
      </html>
    `;
  }

  getSlideTypeLabel(slideType) {
    const type = CONFIG.SLIDE_TYPES.find((t) => t.value === slideType);
    return type ? type.label : slideType;
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.stateManager.saveState();
    }, CONFIG.UI.AUTO_SAVE_DELAY);
  }

  escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.stateManager.cleanup();
    this.eventSystem.cleanup();
    this.llmService.cleanup();
    this.slideComponents.cleanup();

    console.log("Course Forge cleaned up");
  }
}

// Global variables for onclick handlers
let courseForge = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    courseForge = new CourseForgeApp();
    await courseForge.init();
    window.courseForge = courseForge;

    // Setup global error handlers
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
      StatusManager.showError("An unexpected error occurred");
    });

    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      StatusManager.showError("An unexpected error occurred");
    });
  } catch (error) {
    console.error("Failed to initialize Course Forge:", error);
    StatusManager.showError(
      "Failed to initialize application. Please refresh the page."
    );
  }
});
