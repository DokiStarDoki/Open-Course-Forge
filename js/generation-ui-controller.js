/**
 * Course Forge MVP - Generation UI Controller (WITH GROUND TRUTH SUPPORT)
 * Handles content generation display, interaction, and UI management with ground truth editing
 */

class GenerationUIController {
  constructor(stateManager, eventSystem, contentGenerator) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.contentGenerator = contentGenerator;
    this.eventHandlers = new Map();
    this.editingSession = new Map(); // Track editing sessions
    this.autoSaveTimeouts = {}; // Track auto-save timeouts

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        "GenerationUIController initialized with ground truth support"
      );
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // React to chunks changes
    this.stateManager.subscribe("chunks", () => {
      this.updateGenerationUI();
    });

    // Listen for content generation events
    this.eventSystem.on("content:generated", () => {
      this.updateGenerationUI();
    });

    this.eventSystem.on("content:updated", () => {
      this.updateGenerationUI();
    });

    this.eventSystem.on("content:generation-failed", (data) => {
      this.handleGenerationError(data.chunkId, data.error);
    });
  }

  /**
   * Update generation UI
   */
  updateGenerationUI() {
    const container = document.getElementById("generationContainer");
    const chunks = this.stateManager.getState("chunks") || [];

    if (!container) return;

    if (chunks.length === 0) {
      this.renderEmptyState(container);
    } else {
      this.renderGenerationView(container, chunks);
    }

    // Setup inline editing after UI update
    this.setupInlineEditing();

    // Reinitialize icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  /**
   * Setup inline editing for all contenteditable elements
   */
  setupInlineEditing() {
    // Remove existing handlers to prevent duplicates
    this.cleanupEditingHandlers();

    // Find all contenteditable elements
    const editableElements = document.querySelectorAll(
      '[contenteditable="true"]'
    );

    editableElements.forEach((element) => {
      const chunkId = element.dataset.chunkId;
      const field = element.dataset.field;

      if (!chunkId || !field) return;

      // Create handler functions
      const focusHandler = (e) =>
        this.startInlineEdit(e.target, chunkId, field);
      const blurHandler = (e) => this.saveInlineEdit(e.target);
      const keydownHandler = (e) => this.handleInlineEditKeydown(e, e.target);

      // Add event listeners
      element.addEventListener("focus", focusHandler);
      element.addEventListener("blur", blurHandler);
      element.addEventListener("keydown", keydownHandler);

      // Store handlers for cleanup
      const handlerKey = `${chunkId}-${field}`;
      this.eventHandlers.set(handlerKey, {
        element,
        handlers: {
          focus: focusHandler,
          blur: blurHandler,
          keydown: keydownHandler,
        },
      });
    });

    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        `Setup inline editing for ${editableElements.length} elements`
      );
    }
  }

  /**
   * Cleanup editing handlers
   */
  cleanupEditingHandlers() {
    this.eventHandlers.forEach(({ element, handlers }) => {
      element.removeEventListener("focus", handlers.focus);
      element.removeEventListener("blur", handlers.blur);
      element.removeEventListener("keydown", handlers.keydown);
    });

    this.eventHandlers.clear();
  }

  /**
   * Start inline editing session
   */
  startInlineEdit(element, chunkId, field) {
    const sessionKey = `${chunkId}-${field}`;

    // Store original value
    this.editingSession.set(sessionKey, {
      originalValue: this.getElementContent(element),
      element: element,
      chunkId: chunkId,
      field: field,
      startTime: Date.now(),
    });

    // Add editing class
    element.classList.add("editing");

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Started editing: ${field} for chunk ${chunkId}`);
    }
  }

  /**
   * Save inline edit
   */
  saveInlineEdit(element) {
    const chunkId = element.dataset.chunkId;
    const field = element.dataset.field;
    const sessionKey = `${chunkId}-${field}`;

    if (!chunkId || !field) return;

    const session = this.editingSession.get(sessionKey);
    if (!session) return;

    const newValue = this.getElementContent(element).trim();
    const hasChanged = newValue !== session.originalValue;

    // Remove editing class
    element.classList.remove("editing");

    if (hasChanged) {
      // Clear any pending auto-save
      if (this.autoSaveTimeouts[sessionKey]) {
        clearTimeout(this.autoSaveTimeouts[sessionKey]);
      }

      // Update content immediately
      this.updateChunkContent(chunkId, field, newValue);

      if (CONFIG.DEBUG.ENABLED) {
        console.log(`Saved edit: ${field} = "${newValue}"`);
      }
    }

    // Clean up session
    this.editingSession.delete(sessionKey);
  }

  /**
   * Cancel inline editing
   */
  cancelEditing(chunkId, field, element) {
    const sessionKey = `${chunkId}-${field}`;
    const session = this.editingSession.get(sessionKey);

    if (session) {
      // Restore original value
      if (element.tagName === "INPUT") {
        element.value = session.originalValue;
      } else {
        element.textContent = session.originalValue;
      }

      element.classList.remove("editing");
      this.editingSession.delete(sessionKey);

      if (CONFIG.DEBUG.ENABLED) {
        console.log(`Cancelled editing: ${field}`);
      }
    }
  }

  /**
   * Handle keydown events during inline editing
   */
  handleInlineEditKeydown(event, element) {
    const chunkId = element.dataset.chunkId;
    const field = element.dataset.field;

    if (!chunkId || !field) return;

    // Escape key: cancel editing
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancelEditing(chunkId, field, element);
      return;
    }

    // Enter behavior for different field types
    if (event.key === "Enter") {
      if (
        field.includes("title") ||
        field.includes("header") ||
        field === "groundTruth"
      ) {
        // Single-line fields: blur on Enter (except ground truth which can be multi-line)
        if (field !== "groundTruth") {
          event.preventDefault();
          element.blur();
        }
      }
      // Multi-line fields: allow normal Enter behavior
    }
  }

  /**
   * Get content from element based on its type
   */
  getElementContent(element) {
    if (element.tagName === "INPUT") {
      return element.value;
    } else if (element.tagName === "SELECT") {
      return element.value;
    } else {
      // For contenteditable elements, return text content for most fields
      return element.textContent || "";
    }
  }

  /**
   * Update chunk content in state (ENHANCED FOR GROUND TRUTH)
   */
  updateChunkContent(chunkId, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunkIndex = chunks.findIndex((c) => c.id === chunkId);

    if (chunkIndex < 0) {
      console.error(`Chunk not found: ${chunkId}`);
      return;
    }

    const chunk = chunks[chunkIndex];

    // Handle ground truth updates directly on chunk object
    if (field === "groundTruth") {
      chunk.groundTruth = value;

      // Visual feedback for ground truth update
      const element = document.querySelector(
        `[data-chunk-id="${chunkId}"][data-field="groundTruth"]`
      );
      if (element) {
        element.classList.add("updated");
        setTimeout(() => element.classList.remove("updated"), 1000);
      }

      StatusManager.showSuccess("Ground truth updated");
    } else if (chunk.generatedContent) {
      // Handle generated content updates
      this.setNestedValue(chunk.generatedContent, field, value);
    } else {
      console.warn(`No content to update for field: ${field}`);
      return;
    }

    // Update the chunk in state
    chunks[chunkIndex] = chunk;
    this.stateManager.setState("chunks", chunks);

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Updated ${field} for chunk ${chunkId}:`, value);
    }

    // Emit update event
    this.eventSystem.emit("content:updated", {
      chunkId,
      field,
      value,
    });
  }

  /**
   * Set nested value using dot notation (e.g., "bullets.0", "icons.1.title")
   */
  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!current[key]) {
        // Create array if next key is numeric, object otherwise
        const nextKey = keys[i + 1];
        current[key] = /^\d+$/.test(nextKey) ? [] : {};
      }

      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Render empty state
   */
  renderEmptyState(container) {
    container.innerHTML = `
      <div class="generation-empty-state">
        <i data-lucide="layers"></i>
        <h3>No Content to Generate</h3>
        <p>Create some chunks first to begin generating slide content.</p>
        <button class="btn btn-primary" onclick="app.showTab('chunks')">
          <i data-lucide="arrow-left"></i>
          Go to Chunks
        </button>
      </div>
    `;
  }

  /**
   * Render generation view
   */
  renderGenerationView(container, chunks) {
    const sortedChunks = chunks.sort((a, b) => a.order - b.order);
    const stats = this.calculateGenerationStats(chunks);

    container.innerHTML = `
      <div class="generation-header">
        <div class="generation-stats">
          ${this.renderGenerationStats(stats)}
        </div>
        <div class="generation-actions">
          <button class="btn btn-primary" onclick="generationUIController.generateAllContent()">
            <i data-lucide="sparkles"></i>
            Generate All
          </button>
          <button class="btn btn-secondary" onclick="generationUIController.generateSelected()">
            <i data-lucide="check-square"></i>
            Generate Selected
          </button>
          <div class="generation-filters">
            <select id="generationFilter" onchange="generationUIController.applyFilter()">
              <option value="all">All Slides</option>
              <option value="generated">Generated</option>
              <option value="pending">Pending</option>
            </select>
            <select id="typeFilter" onchange="generationUIController.applyFilter()">
              <option value="all">All Types</option>
              ${CONFIG.SLIDE_TYPES.map(
                (type) => `<option value="${type.value}">${type.label}</option>`
              ).join("")}
            </select>
          </div>
        </div>
      </div>
      <div class="slides-container">
        ${sortedChunks
          .map((chunk) => this.renderGenerationItem(chunk))
          .join("")}
      </div>
    `;

    this.setupGenerationInteractions();
  }

  /**
   * Calculate generation statistics
   */
  calculateGenerationStats(chunks) {
    return {
      total: chunks.length,
      generated: chunks.filter((chunk) => chunk.generatedContent).length,
      pending: chunks.filter(
        (chunk) => !chunk.generatedContent && !chunk.isLocked
      ).length,
      locked: chunks.filter((chunk) => chunk.isLocked).length,
    };
  }

  /**
   * Render generation statistics
   */
  renderGenerationStats(stats) {
    return `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Slides</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.generated}</div>
          <div class="stat-label">Generated</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.pending}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
    `;
  }

  /**
   * Render individual generation item
   */
  renderGenerationItem(chunk) {
    const hasContent = !!chunk.generatedContent;
    const isProcessing =
      this.contentGenerator &&
      this.contentGenerator.currentlyGenerating.has(chunk.id);

    return `
      <div class="generation-item ${hasContent ? "has-content" : ""} ${
      isProcessing ? "processing" : ""
    }" 
           data-chunk-id="${chunk.id}" 
           data-slide-type="${chunk.slideType}">
        <div class="generation-header">
          <div class="chunk-info">
            <input type="checkbox" class="generation-checkbox" data-chunk-id="${
              chunk.id
            }">
            <div class="chunk-details">
              <h3 class="chunk-title">${this.escapeHtml(chunk.title)}</h3>
              <div class="chunk-meta">
                <span class="slide-type-badge">${this.getSlideTypeLabel(
                  chunk.slideType
                )}</span>
                <span class="content-status ${
                  hasContent ? "generated" : "pending"
                }">
                  ${hasContent ? "Generated" : "Pending"}
                </span>
              </div>
            </div>
          </div>
          <div class="generation-controls">
            <button class="btn btn-primary" 
                    onclick="generationUIController.${
                      hasContent
                        ? "regenerateChunkContent"
                        : "generateChunkContent"
                    }('${chunk.id}')" 
                    title="${hasContent ? "Regenerate" : "Generate"} content"
                    ${isProcessing ? "disabled" : ""}>
              <i data-lucide="${
                isProcessing ? "loader" : hasContent ? "refresh-cw" : "sparkles"
              }"></i>
              ${
                isProcessing
                  ? "Generating..."
                  : hasContent
                  ? "Regenerate"
                  : "Generate"
              }
            </button>
            <div class="generation-actions-dropdown">
              <button class="btn btn-secondary btn-sm dropdown-toggle" 
                      onclick="generationUIController.toggleGenerationActions('${
                        chunk.id
                      }', this)">
                <i data-lucide="more-horizontal"></i>
              </button>
              <div class="dropdown-menu" id="gen-actions-${chunk.id}">
                <button onclick="generationUIController.copySlideContent('${
                  chunk.id
                }')" ${!hasContent ? "disabled" : ""}>
                  <i data-lucide="copy"></i> Copy Content
                </button>
                <button onclick="generationUIController.previewSlide('${
                  chunk.id
                }')" ${!hasContent ? "disabled" : ""}>
                  <i data-lucide="eye"></i> Preview Slide
                </button>
                <hr>
                <button onclick="generationUIController.resetSlideContent('${
                  chunk.id
                }')" ${!hasContent ? "disabled" : ""}>
                  <i data-lucide="rotate-ccw"></i> Reset Content
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="slide-preview">
          ${this.renderSlidePreview(chunk)}
        </div>
        ${this.renderGenerationProgress(chunk.id, isProcessing)}
      </div>
    `;
  }

  /**
   * Render slide preview with ground truth support
   */
  renderSlidePreview(chunk) {
    // If slideRenderer is available, use it for full slide rendering
    if (window.slideRenderer) {
      const slideContent = window.slideRenderer.renderSlide(chunk, true); // TRUE for editable

      // Add ground truth section to the slide content
      const groundTruthSection = this.renderGroundTruthSection(chunk);

      return `
        ${groundTruthSection}
        <div class="slide-content-wrapper">
          ${slideContent}
        </div>
      `;
    } else {
      // Fallback to basic preview with ground truth
      return this.renderBasicSlidePreview(chunk);
    }
  }

  /**
   * Render ground truth section
   */
  renderGroundTruthSection(chunk) {
    const hasGroundTruth = chunk.groundTruth && chunk.groundTruth.trim();
    const isExpanded = hasGroundTruth || !chunk.generatedContent; // Expand if no content yet

    return `
      <div class="ground-truth-section ${isExpanded ? "expanded" : ""}">
        <div class="ground-truth-header">
          <h4 class="ground-truth-label">
            <i data-lucide="target"></i>
            Ground Truth Guidance
          </h4>
        </div>
        <div class="ground-truth-content ${
          hasGroundTruth ? "has-content" : "empty"
        }" 
             id="ground-truth-${chunk.id}"
             contenteditable="true"
             data-chunk-id="${chunk.id}"
             data-field="groundTruth"
             onblur="generationUIController.saveInlineEdit(this)"
             onkeydown="generationUIController.handleInlineEditKeydown(event, this)"
             placeholder="Describe what this slide should cover and its purpose..."
             style="${isExpanded ? "" : "max-height: 3rem; overflow: hidden;"}">
          ${this.escapeHtml(chunk.groundTruth || "")}
        </div>
        ${this.renderGroundTruthHints(chunk)}
      </div>
    `;
  }

  /**
   * Render ground truth hints
   */
  renderGroundTruthHints(chunk) {
    if (chunk.groundTruth && chunk.groundTruth.trim()) {
      return ""; // Don't show hints if content exists
    }

    const hints = {
      title:
        "Introduce the course topic and overview what learners will discover",
      courseInfo:
        "Outline course duration, target audience, and key learning objectives",
      textAndImage: "Explain the main concept with supporting visual context",
      textAndBullets: "Break down key points and actionable information",
      iconsWithTitles: "Highlight important categories or process steps",
      multipleChoice: "Test understanding of a specific concept or scenario",
      tabs: "Organize related information into digestible sections",
      flipCards: "Present terms/concepts with detailed explanations",
      faq: "Address common questions or concerns about this topic",
      popups: "Provide additional resources or detailed explanations",
    };

    const hint =
      hints[chunk.slideType] || "Describe what this slide should cover...";

    return `
      <div class="ground-truth-hint">
        <i data-lucide="lightbulb"></i>
        <span>${hint}</span>
      </div>
    `;
  }

  /**
   * Toggle ground truth expanded state
   */
  toggleGroundTruthExpanded(chunkId) {
    const section = document
      .querySelector(`#ground-truth-${chunkId}`)
      .closest(".ground-truth-section");
    const content = document.querySelector(`#ground-truth-${chunkId}`);
    const icon = section.querySelector(".expand-icon");

    if (!section || !content || !icon) return;

    const isExpanded = section.classList.contains("expanded");

    if (isExpanded) {
      // Collapse
      section.classList.remove("expanded");
      content.style.maxHeight = "3rem";
      content.style.overflow = "hidden";
      icon.setAttribute("data-lucide", "chevron-down");
    } else {
      // Expand
      section.classList.add("expanded");
      content.style.maxHeight = "none";
      content.style.overflow = "visible";
      icon.setAttribute("data-lucide", "chevron-up");
    }

    // Reinitialize icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  /**
   * Render basic slide preview (fallback) with ground truth
   */
  renderBasicSlidePreview(chunk) {
    const groundTruthSection = this.renderGroundTruthSection(chunk);

    if (!chunk.generatedContent) {
      return `
        ${groundTruthSection}
        <div class="empty-slide-preview">
          <i data-lucide="file-text"></i>
          <p>Click "Generate" to create content for this slide</p>
          ${
            chunk.groundTruth
              ? `
            <div class="preview-ground-truth">
              <strong>Ground Truth:</strong> ${this.escapeHtml(
                chunk.groundTruth.substring(0, 100)
              )}${chunk.groundTruth.length > 100 ? "..." : ""}
            </div>
          `
              : ""
          }
        </div>
      `;
    }

    return `
      ${groundTruthSection}
      <div class="basic-slide-preview">
        <h4>${this.escapeHtml(
          chunk.generatedContent.header || chunk.title
        )}</h4>
        <p>${this.escapeHtml(
          chunk.generatedContent.text || "Generated content preview..."
        )}</p>
      </div>
    `;
  }

  /**
   * Render generation progress indicator
   */
  renderGenerationProgress(chunkId, isProcessing) {
    if (!isProcessing) return "";

    return `
      <div class="generation-progress" id="progress-${chunkId}">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="progress-text">Generating content...</div>
      </div>
    `;
  }

  /**
   * Setup generation interactions
   */
  setupGenerationInteractions() {
    // Auto-refresh progress for processing items
    const processingItems = document.querySelectorAll(
      ".generation-item.processing"
    );
    if (processingItems.length > 0) {
      setTimeout(() => {
        this.updateGenerationUI();
      }, 2000);
    }
  }

  /**
   * Generate content for specific chunk
   */
  async generateChunkContent(chunkId) {
    if (!this.contentGenerator) {
      StatusManager.showError("Content generator not initialized");
      return;
    }

    await this.contentGenerator.generateSlideContent(chunkId);
  }

  /**
   * Regenerate content for specific chunk
   */
  async regenerateChunkContent(chunkId) {
    if (!this.contentGenerator) {
      StatusManager.showError("Content generator not initialized");
      return;
    }

    await this.contentGenerator.regenerateSlideContent(chunkId);
  }

  /**
   * Generate all content
   */
  async generateAllContent() {
    if (!this.contentGenerator) {
      StatusManager.showError("Content generator not initialized");
      return;
    }

    await this.contentGenerator.generateAllContent();
  }

  /**
   * Generate selected content
   */
  async generateSelected() {
    const selectedIds = Array.from(
      document.querySelectorAll(".generation-checkbox:checked")
    ).map((cb) => cb.dataset.chunkId);

    if (selectedIds.length === 0) {
      StatusManager.showWarning("Please select slides to generate");
      return;
    }

    StatusManager.showLoading(
      `Generating content for ${selectedIds.length} slides...`
    );

    let successCount = 0;
    let errorCount = 0;

    for (const chunkId of selectedIds) {
      try {
        await this.generateChunkContent(chunkId);
        successCount++;
      } catch (error) {
        console.error(`Failed to generate content for ${chunkId}:`, error);
        errorCount++;
      }
    }

    StatusManager.showSuccess(
      `Generated ${successCount} slides ${
        errorCount > 0 ? `(${errorCount} failed)` : ""
      }`
    );
  }

  /**
   * Apply filters to generation items
   */
  applyFilter() {
    const generationFilter =
      document.getElementById("generationFilter")?.value || "all";
    const typeFilter = document.getElementById("typeFilter")?.value || "all";

    const items = document.querySelectorAll(".generation-item");

    items.forEach((item) => {
      const chunkId = item.dataset.chunkId;
      const slideType = item.dataset.slideType;
      const hasContent = item.classList.contains("has-content");

      let show = true;

      // Apply generation status filter
      if (generationFilter === "generated" && !hasContent) show = false;
      if (generationFilter === "pending" && hasContent) show = false;

      // Apply slide type filter
      if (typeFilter !== "all" && slideType !== typeFilter) show = false;

      item.style.display = show ? "block" : "none";
    });

    this.updateFilterStats();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    const generationFilter = document.getElementById("generationFilter");
    const typeFilter = document.getElementById("typeFilter");

    if (generationFilter) generationFilter.value = "all";
    if (typeFilter) typeFilter.value = "all";

    this.applyFilter();
  }

  /**
   * Update filter statistics
   */
  updateFilterStats() {
    const visibleItems = document.querySelectorAll(
      '.generation-item[style=""], .generation-item:not([style*="none"])'
    );
    const totalItems = document.querySelectorAll(".generation-item");

    // Could show "Showing X of Y slides" message if needed
  }

  /**
   * Toggle generation actions dropdown
   */
  toggleGenerationActions(chunkId, button) {
    const dropdown = document.getElementById(`gen-actions-${chunkId}`);
    if (!dropdown) return;

    // Close other dropdowns
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      if (menu !== dropdown) {
        menu.classList.remove("show");
      }
    });

    dropdown.classList.toggle("show");

    if (dropdown.classList.contains("show")) {
      const closeHandler = (e) => {
        if (!button.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove("show");
          document.removeEventListener("click", closeHandler);
        }
      };

      setTimeout(() => {
        document.addEventListener("click", closeHandler);
      }, 0);
    }
  }

  /**
   * Copy slide content to clipboard
   */
  async copySlideContent(chunkId) {
    const chunk = this.getChunkById(chunkId);
    if (!chunk || !chunk.generatedContent) return;

    try {
      const content = JSON.stringify(chunk.generatedContent, null, 2);
      await navigator.clipboard.writeText(content);
      StatusManager.showSuccess("Content copied to clipboard");
    } catch (error) {
      console.error("Failed to copy content:", error);
      StatusManager.showError("Failed to copy content");
    }
  }

  /**
   * Preview individual slide
   */
  previewSlide(chunkId) {
    const chunk = this.getChunkById(chunkId);
    if (!chunk || !chunk.generatedContent) return;

    // Create single slide preview
    const previewWindow = window.open(
      "",
      `slidePreview-${chunkId}`,
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );

    if (!previewWindow) {
      StatusManager.showError(
        "Popup blocked. Please allow popups for slide preview."
      );
      return;
    }

    const slideContent = window.slideRenderer
      ? window.slideRenderer.renderSlide(chunk, false)
      : this.renderBasicSlidePreview(chunk);

    const previewHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Slide Preview: ${chunk.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; }
          .preview-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 0.75rem; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .slide-title { font-size: 1.5rem; margin-bottom: 1rem; color: #1f2937; }
        </style>
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
      </head>
      <body>
        <div class="preview-container">
          ${slideContent}
        </div>
        <script>
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        </script>
      </body>
      </html>
    `;

    previewWindow.document.write(previewHTML);
    previewWindow.document.close();
    previewWindow.focus();
  }

  /**
   * Reset slide content
   */
  resetSlideContent(chunkId) {
    const confirmed = confirm(
      "Reset slide content? This will remove all generated content for this slide."
    );
    if (!confirmed) return;

    const chunks = this.stateManager.getState("chunks") || [];
    const chunkIndex = chunks.findIndex((c) => c.id === chunkId);

    if (chunkIndex >= 0) {
      chunks[chunkIndex].generatedContent = null;
      chunks[chunkIndex].lastGenerated = null;
      this.stateManager.setState("chunks", chunks);

      StatusManager.showSuccess("Slide content reset");
      this.eventSystem.emit("content:reset", { chunkId });
    }
  }

  /**
   * Handle generation error
   */
  handleGenerationError(chunkId, error) {
    const item = document.querySelector(`[data-chunk-id="${chunkId}"]`);
    if (item) {
      item.classList.remove("processing");
      item.classList.add("error");

      // Show error in UI
      const errorDiv = document.createElement("div");
      errorDiv.className = "generation-error";
      errorDiv.innerHTML = `
        <i data-lucide="alert-triangle"></i>
        <span>Generation failed: ${error}</span>
        <button onclick="this.parentElement.remove()" class="error-close">&times;</button>
      `;

      const preview = item.querySelector(".slide-preview");
      if (preview) {
        preview.appendChild(errorDiv);
      }
    }
  }

  /**
   * Get chunk by ID
   */
  getChunkById(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    return chunks.find((chunk) => chunk.id === chunkId);
  }

  /**
   * Get slide type label
   */
  getSlideTypeLabel(slideType) {
    const slideTypeMap = new Map(
      CONFIG.SLIDE_TYPES.map((type) => [type.value, type.label])
    );
    return slideTypeMap.get(slideType) || slideType;
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
   * Escape HTML for safe rendering
   */
  escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clean up editing handlers
    this.cleanupEditingHandlers();

    // Clear timeouts
    if (this.autoSaveTimeouts) {
      Object.values(this.autoSaveTimeouts).forEach(clearTimeout);
      this.autoSaveTimeouts = {};
    }

    // Close any open dropdowns
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("show");
    });

    console.log("GenerationUIController cleaned up");
  }
}

// Make available globally
window.generationUIController = null;
