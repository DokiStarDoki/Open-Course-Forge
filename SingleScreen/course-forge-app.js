/**
 * Course Forge MVP - Main Application with Real AI Integration
 * Single-screen course creation interface with learning science principles
 */

class CourseForgeApp {
  constructor() {
    // Core systems
    this.stateManager = new StateManager();
    this.eventSystem = new EventSystem();
    this.llmService = new SimpleLLMService();

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
      generatedContent: null,
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

  renderChunks() {
    const container = document.getElementById("chunks-container");
    let emptyState = document.getElementById("empty-state");
    const chunks = this.stateManager.getState("chunks") || [];

    if (!container) {
      console.error("chunks-container element not found!");
      return;
    }

    if (chunks.length === 0) {
      // Create empty state if it doesn't exist (it gets removed when we render chunks)
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
    const contentPreview = hasContent
      ? this.generateContentPreview(chunk.generatedContent, chunk.slideType)
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
          <h4>Generated Slide Content <span class="text-muted">(AI-generated, pedagogically optimized)</span></h4>
          <div class="slide-type-content ${hasContent ? "" : "empty"}">
            ${contentPreview}
          </div>
          ${
            !hasContent && hasSourceContent
              ? "<button onclick=\"courseForge.generateChunkContent('" +
                chunk.id +
                '\')" class="btn btn-primary mt-2">Generate AI Slide Content from Source</button>'
              : ""
          }
        </div>
      </div>
    `;
  }

  generateContentPreview(content, slideType) {
    if (!content) return '<span class="text-muted">No content generated</span>';

    try {
      switch (slideType) {
        case "title":
          return `<h3>${this.escapeHtml(
            content.header || ""
          )}</h3><p>${this.escapeHtml(content.text || "")}</p>`;

        case "courseInfo":
          return `<h3>${this.escapeHtml(
            content.header || ""
          )}</h3><p>${this.escapeHtml(
            content.text || ""
          )}</p><p><strong>Duration:</strong> ${this.escapeHtml(
            content.duration || ""
          )}</p>`;

        case "textAndBullets":
          const bullets = (content.bullets || [])
            .map((bullet) => `<li>${this.escapeHtml(bullet)}</li>`)
            .join("");
          return `<h3>${this.escapeHtml(
            content.header || ""
          )}</h3><p>${this.escapeHtml(content.text || "")}</p>${
            bullets ? `<ul>${bullets}</ul>` : ""
          }`;

        case "textAndImage":
          return `<h3>${this.escapeHtml(
            content.header || ""
          )}</h3><p>${this.escapeHtml(content.text || "")}</p>${
            content.image ? "<p><em>Image: " + content.image + "</em></p>" : ""
          }`;

        case "multipleChoice":
          const options = (content.options || [])
            .map(
              (option, idx) =>
                `<li ${
                  idx === content.correctAnswer
                    ? 'style="font-weight: bold;"'
                    : ""
                }>${this.escapeHtml(option)}</li>`
            )
            .join("");
          return `<h3>Question:</h3><p>${this.escapeHtml(
            content.question || ""
          )}</p>${options ? `<ol>${options}</ol>` : ""}`;

        case "iconsWithTitles":
          const icons = (content.icons || [])
            .map(
              (icon) =>
                `<div><strong>${this.escapeHtml(
                  icon.title || ""
                )}</strong>: ${this.escapeHtml(icon.description || "")}</div>`
            )
            .join("");
          return `<h3>${this.escapeHtml(content.header || "")}</h3>${icons}`;

        case "tabs":
          if (Array.isArray(content)) {
            const tabs = content
              .map(
                (tab) =>
                  `<div><strong>${this.escapeHtml(
                    tab.title || ""
                  )}</strong>: ${this.escapeHtml(tab.content || "")}</div>`
              )
              .join("");
            return tabs;
          }
          break;

        case "flipCards":
          if (Array.isArray(content)) {
            const cards = content
              .map(
                (card) =>
                  `<div><strong>Front:</strong> ${this.escapeHtml(
                    card.front || ""
                  )}<br><strong>Back:</strong> ${this.escapeHtml(
                    card.back || ""
                  )}</div>`
              )
              .join("");
            return cards;
          }
          break;

        case "faq":
          const faqItems = (content.items || [])
            .map(
              (item) =>
                `<div><strong>Q:</strong> ${this.escapeHtml(
                  item.question || ""
                )}<br><strong>A:</strong> ${this.escapeHtml(
                  item.answer || ""
                )}</div>`
            )
            .join("");
          return `<h3>${this.escapeHtml(content.header || "")}</h3>${faqItems}`;

        case "popups":
          if (Array.isArray(content)) {
            const popups = content
              .map(
                (popup) =>
                  `<div><strong>${this.escapeHtml(
                    popup.title || ""
                  )}</strong>: ${this.escapeHtml(popup.content || "")}</div>`
              )
              .join("");
            return popups;
          }
          break;

        default:
          return `<p>${this.escapeHtml(JSON.stringify(content))}</p>`;
      }
    } catch (error) {
      console.error("Error generating content preview:", error);
      return '<span class="text-danger">Error generating preview</span>';
    }

    return '<span class="text-muted">Preview not available</span>';
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
    const previewData = {
      course: config,
      chunks: chunksWithContent,
    };

    // Create a simple preview window
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

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preview: ${this.escapeHtml(config.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .chunk { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .chunk-title { color: #333; margin-bottom: 15px; }
          .chunk-content { margin-bottom: 15px; }
          .chunk-type { background: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
          .chunk-metadata { background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 12px; }
          .blooms-level { padding: 2px 6px; border-radius: 3px; font-weight: bold; }
          .blooms-remember { background: #e3f2fd; color: #1565c0; }
          .blooms-understand { background: #f3e5f5; color: #7b1fa2; }
          .blooms-apply { background: #e8f5e8; color: #2e7d32; }
          .blooms-analyze { background: #fff3e0; color: #ef6c00; }
          .blooms-evaluate { background: #fce4ec; color: #c2185b; }
          .blooms-create { background: #f1f8e9; color: #558b2f; }
        </style>
      </head>
      <body>
        <h1>${this.escapeHtml(config.title)}</h1>
        <p><strong>Duration:</strong> ${this.escapeHtml(
          config.estimatedDuration
        )}</p>
        <p><strong>Audience:</strong> ${this.escapeHtml(
          config.targetAudience
        )}</p>
        ${chunksWithContent
          .map(
            (chunk, index) => `
          <div class="chunk">
            <div class="chunk-metadata">
              <span class="blooms-level blooms-${
                chunk.bloomsLevel || "understand"
              }">${chunk.bloomsLevel || "understand"}</span>
              | Load: ${chunk.cognitiveLoad || "medium"}
              | ${chunk.interactionLevel || "active"}
              ${
                chunk.assessmentType && chunk.assessmentType !== "none"
                  ? "| " + chunk.assessmentType
                  : ""
              }
            </div>
            <h2 class="chunk-title">${index + 1}. ${this.escapeHtml(
              chunk.title
            )}</h2>
            <div class="chunk-content">${this.generateContentPreview(
              chunk.generatedContent,
              chunk.slideType
            )}</div>
            <div class="chunk-type">Type: ${this.getSlideTypeLabel(
              chunk.slideType
            )}</div>
          </div>
        `
          )
          .join("")}
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
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(config.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
          .chunk { margin-bottom: 40px; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
          .chunk-title { color: #333; margin-bottom: 20px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .chunk-content { margin-bottom: 15px; }
          .slide-type { background: #e9ecef; padding: 5px 10px; border-radius: 4px; font-size: 12px; margin-bottom: 10px; display: inline-block; }
          .chunk-metadata { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 12px; }
          .blooms-level { padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-right: 8px; }
          .blooms-remember { background: #e3f2fd; color: #1565c0; }
          .blooms-understand { background: #f3e5f5; color: #7b1fa2; }
          .blooms-apply { background: #e8f5e8; color: #2e7d32; }
          .blooms-analyze { background: #fff3e0; color: #ef6c00; }
          .blooms-evaluate { background: #fce4ec; color: #c2185b; }
          .blooms-create { background: #f1f8e9; color: #558b2f; }
          ul, ol { margin-left: 20px; }
          .metadata { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${this.escapeHtml(config.title)}</h1>
          <div class="metadata">
            <p><strong>Duration:</strong> ${this.escapeHtml(
              config.estimatedDuration
            )}</p>
            <p><strong>Target Audience:</strong> ${this.escapeHtml(
              config.targetAudience
            )}</p>
            ${
              config.learningObjectives && config.learningObjectives.length > 0
                ? `
              <p><strong>Learning Objectives:</strong></p>
              <ul>
                ${config.learningObjectives
                  .map((obj) => `<li>${this.escapeHtml(obj)}</li>`)
                  .join("")}
              </ul>
            `
                : ""
            }
          </div>
        </div>
        
        ${chunks
          .map(
            (chunk, index) => `
          <div class="chunk">
            <div class="chunk-metadata">
              <span class="blooms-level blooms-${
                chunk.bloomsLevel || "understand"
              }">${chunk.bloomsLevel || "understand"}</span>
              Cognitive Load: ${chunk.cognitiveLoad || "medium"} |
              Interaction: ${chunk.interactionLevel || "active"}
              ${
                chunk.assessmentType && chunk.assessmentType !== "none"
                  ? "| Assessment: " + chunk.assessmentType
                  : ""
              }
            </div>
            <div class="slide-type">${this.getSlideTypeLabel(
              chunk.slideType
            )}</div>
            <h2 class="chunk-title">${index + 1}. ${this.escapeHtml(
              chunk.title
            )}</h2>
            <div class="chunk-content">${this.generateContentPreview(
              chunk.generatedContent,
              chunk.slideType
            )}</div>
          </div>
        `
          )
          .join("")}
        
        <div class="footer">
          <p>Generated by Course Forge MVP with AI and Learning Science Principles on ${new Date().toLocaleDateString()}</p>
          <p>Total sections: ${
            chunks.length
          } | Bloom's distribution: ${JSON.stringify(
      this.analyzeLearningScience(chunks).bloomsDistribution
    )}</p>
        </div>
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

    console.log("Course Forge cleaned up");
  }
}

// Global variables for onclick handlers
let courseForge = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    courseForge = new CourseForgeApp();
    await courseForge.init(); // Call init explicitly after construction
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
