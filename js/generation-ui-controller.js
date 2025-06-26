/**
 * Course Forge MVP - Generation UI Controller (FIXED INLINE EDITING)
 * Handles content generation display, interaction, and UI management with working inline editing
 */

class GenerationUIController {
  constructor(stateManager, eventSystem, contentGenerator) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.contentGenerator = contentGenerator;
    this.eventHandlers = new Map();
    this.editingSession = new Map(); // Track editing sessions
    this.unsavedChanges = new Set(); // Track chunks with unsaved changes

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("GenerationUIController initialized with inline editing");
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
   * Update generation UI with inline editing support
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
    // Remove existing handlers
    this.cleanupEditingHandlers();

    // Find all contenteditable elements
    const editableElements = document.querySelectorAll(
      '[contenteditable="true"][data-field]'
    );

    editableElements.forEach((element) => {
      this.setupElementEditing(element);
    });

    // Setup image URL inputs
    const imageInputs = document.querySelectorAll(
      "input.image-url-input[data-field]"
    );
    imageInputs.forEach((input) => {
      this.setupImageInputEditing(input);
    });

    // Setup select elements (like correct answer selectors)
    const selectElements = document.querySelectorAll("select[data-field]");
    selectElements.forEach((select) => {
      this.setupSelectEditing(select);
    });

    console.log(`Setup inline editing for ${editableElements.length} elements`);
  }

  /**
   * Setup editing for a specific element
   */
  setupElementEditing(element) {
    const chunkId = this.findChunkIdForElement(element);
    const field = element.dataset.field;

    if (!chunkId || !field) {
      console.warn("Element missing chunk ID or field:", element);
      return;
    }

    // Store original content
    const originalContent = element.innerHTML || element.textContent || "";

    // Input event for real-time changes
    const inputHandler = (e) => {
      this.handleElementInput(chunkId, field, element, e);
    };

    // Focus event
    const focusHandler = (e) => {
      this.handleElementFocus(chunkId, field, element, e);
    };

    // Blur event for saving
    const blurHandler = (e) => {
      this.handleElementBlur(chunkId, field, element, e);
    };

    // Keydown for shortcuts
    const keydownHandler = (e) => {
      this.handleElementKeydown(chunkId, field, element, e);
    };

    element.addEventListener("input", inputHandler);
    element.addEventListener("focus", focusHandler);
    element.addEventListener("blur", blurHandler);
    element.addEventListener("keydown", keydownHandler);

    // Store handlers for cleanup
    const handlerKey = `${chunkId}-${field}-${Date.now()}`;
    this.eventHandlers.set(handlerKey, {
      element,
      handlers: [
        { event: "input", handler: inputHandler },
        { event: "focus", handler: focusHandler },
        { event: "blur", handler: blurHandler },
        { event: "keydown", handler: keydownHandler },
      ],
    });

    // Store original content
    element.dataset.originalContent = originalContent;
  }

  /**
   * Setup editing for image URL inputs
   */
  setupImageInputEditing(input) {
    const chunkId = this.findChunkIdForElement(input);
    const field = input.dataset.field;

    if (!chunkId || !field) return;

    const changeHandler = (e) => {
      const newUrl = e.target.value;
      this.updateChunkContent(chunkId, field, newUrl);

      // Update the image element if it exists
      const imageElement = input.parentElement.querySelector(".slide-image");
      if (imageElement) {
        imageElement.src = newUrl;
      }

      this.markChunkAsModified(chunkId);
    };

    input.addEventListener("change", changeHandler);
    input.addEventListener("blur", changeHandler);

    const handlerKey = `${chunkId}-${field}-input-${Date.now()}`;
    this.eventHandlers.set(handlerKey, {
      element: input,
      handlers: [
        { event: "change", handler: changeHandler },
        { event: "blur", handler: changeHandler },
      ],
    });
  }

  /**
   * Setup editing for select elements
   */
  setupSelectEditing(select) {
    const chunkId = this.findChunkIdForElement(select);
    const field = select.dataset.field;

    if (!chunkId || !field) return;

    const changeHandler = (e) => {
      let value = e.target.value;

      // Convert to number if it's correctAnswer field
      if (field === "correctAnswer") {
        value = parseInt(value, 10);
      }

      this.updateChunkContent(chunkId, field, value);
      this.markChunkAsModified(chunkId);
    };

    select.addEventListener("change", changeHandler);

    const handlerKey = `${chunkId}-${field}-select-${Date.now()}`;
    this.eventHandlers.set(handlerKey, {
      element: select,
      handlers: [{ event: "change", handler: changeHandler }],
    });
  }

  /**
   * Handle element input (real-time changes)
   */
  handleElementInput(chunkId, field, element, event) {
    // Visual feedback for changes
    element.classList.add("editing");

    // Mark as modified
    this.markChunkAsModified(chunkId);

    // Auto-save after delay
    this.debounceAutoSave(chunkId, field, element);
  }

  /**
   * Handle element focus
   */
  handleElementFocus(chunkId, field, element, event) {
    element.classList.add("focused");

    // Start editing session
    this.editingSession.set(`${chunkId}-${field}`, {
      element,
      startTime: Date.now(),
      originalContent: element.dataset.originalContent,
    });

    // Show editing toolbar if needed
    this.showEditingToolbar(element);
  }

  /**
   * Handle element blur (save changes)
   */
  handleElementBlur(chunkId, field, element, event) {
    element.classList.remove("focused", "editing");

    const content = this.getElementContent(element);
    this.updateChunkContent(chunkId, field, content);

    // End editing session
    this.editingSession.delete(`${chunkId}-${field}`);

    // Hide editing toolbar
    this.hideEditingToolbar();

    // Save changes
    this.saveChunkChanges(chunkId);
  }

  /**
   * Handle keydown events (shortcuts)
   */
  handleElementKeydown(chunkId, field, element, event) {
    // Ctrl+S / Cmd+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();
      this.saveChunkChanges(chunkId);
      StatusManager.showSuccess("Changes saved");
      return;
    }

    // Escape to cancel
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancelEditing(chunkId, field, element);
      return;
    }

    // Enter behavior for different field types
    if (event.key === "Enter") {
      if (field.includes("title") || field.includes("header")) {
        // Single-line fields: blur on Enter
        event.preventDefault();
        element.blur();
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
      // except for rich content where we might want HTML
      return element.textContent || "";
    }
  }

  /**
   * Update chunk content in state
   */
  updateChunkContent(chunkId, field, value) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunkIndex = chunks.findIndex((c) => c.id === chunkId);

    if (chunkIndex < 0) {
      console.error(`Chunk not found: ${chunkId}`);
      return;
    }

    const chunk = chunks[chunkIndex];
    if (!chunk.generatedContent) {
      console.warn(`No generated content to update for chunk: ${chunkId}`);
      return;
    }

    // Update the content using dot notation
    this.setNestedValue(chunk.generatedContent, field, value);

    // Update the chunk in state
    chunks[chunkIndex] = chunk;
    this.stateManager.setState("chunks", chunks);

    console.log(`Updated ${field} for chunk ${chunkId}:`, value);
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

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  /**
   * Mark chunk as modified
   */
  markChunkAsModified(chunkId) {
    this.unsavedChanges.add(chunkId);

    // Visual feedback
    const chunkElement = document.querySelector(`[data-chunk-id="${chunkId}"]`);
    if (chunkElement) {
      chunkElement.classList.add("modified");
    }

    // Update status
    this.updateModificationStatus();
  }

  /**
   * Save changes for a specific chunk
   */
  saveChunkChanges(chunkId) {
    if (!this.unsavedChanges.has(chunkId)) {
      return; // No changes to save
    }

    // Remove from unsaved changes
    this.unsavedChanges.delete(chunkId);

    // Visual feedback
    const chunkElement = document.querySelector(`[data-chunk-id="${chunkId}"]`);
    if (chunkElement) {
      chunkElement.classList.remove("modified");
      chunkElement.classList.add("saved");

      setTimeout(() => {
        chunkElement.classList.remove("saved");
      }, 2000);
    }

    // Update modification status
    this.updateModificationStatus();

    // Emit event
    this.eventSystem.emit("content:manually-updated", { chunkId });
  }

  /**
   * Save all changes
   */
  saveAllChanges() {
    const modifiedChunks = Array.from(this.unsavedChanges);

    modifiedChunks.forEach((chunkId) => {
      this.saveChunkChanges(chunkId);
    });

    if (modifiedChunks.length > 0) {
      StatusManager.showSuccess(
        `Saved changes to ${modifiedChunks.length} slides`
      );
    }
  }

  /**
   * Cancel editing for an element
   */
  cancelEditing(chunkId, field, element) {
    const session = this.editingSession.get(`${chunkId}-${field}`);
    if (session) {
      // Restore original content
      if (element.tagName === "INPUT") {
        element.value = session.originalContent;
      } else {
        element.innerHTML = session.originalContent;
      }

      element.blur();
    }
  }

  /**
   * Debounced auto-save
   */
  debounceAutoSave(chunkId, field, element) {
    const key = `${chunkId}-${field}`;

    // Clear existing timeout
    if (this.autoSaveTimeouts && this.autoSaveTimeouts[key]) {
      clearTimeout(this.autoSaveTimeouts[key]);
    }

    if (!this.autoSaveTimeouts) {
      this.autoSaveTimeouts = {};
    }

    // Set new timeout
    this.autoSaveTimeouts[key] = setTimeout(() => {
      const content = this.getElementContent(element);
      this.updateChunkContent(chunkId, field, content);
      delete this.autoSaveTimeouts[key];
    }, 1000); // Save after 1 second of inactivity
  }

  /**
   * Find chunk ID for an element
   */
  findChunkIdForElement(element) {
    // Walk up the DOM to find the chunk container
    let current = element;
    while (current && current !== document.body) {
      if (current.dataset && current.dataset.chunkId) {
        return current.dataset.chunkId;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Show editing toolbar
   */
  showEditingToolbar(element) {
    // Create toolbar if it doesn't exist
    let toolbar = document.getElementById("editing-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.id = "editing-toolbar";
      toolbar.className = "editing-toolbar";
      toolbar.innerHTML = `
        <div class="toolbar-content">
          <button class="toolbar-btn" onclick="generationUIController.saveAllChanges()">
            <i data-lucide="save"></i> Save All
          </button>
          <button class="toolbar-btn" onclick="generationUIController.discardAllChanges()">
            <i data-lucide="x"></i> Discard
          </button>
          <span class="toolbar-status" id="toolbar-status"></span>
        </div>
      `;
      document.body.appendChild(toolbar);
    }

    toolbar.classList.add("visible");
    this.updateToolbarPosition(element);
  }

  /**
   * Hide editing toolbar
   */
  hideEditingToolbar() {
    const toolbar = document.getElementById("editing-toolbar");
    if (toolbar && this.editingSession.size === 0) {
      toolbar.classList.remove("visible");
    }
  }

  /**
   * Update toolbar position
   */
  updateToolbarPosition(element) {
    const toolbar = document.getElementById("editing-toolbar");
    if (!toolbar) return;

    const rect = element.getBoundingClientRect();
    const toolbarHeight = 50;

    let top = rect.top - toolbarHeight - 10;
    if (top < 10) {
      top = rect.bottom + 10;
    }

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
  }

  /**
   * Update modification status
   */
  updateModificationStatus() {
    const status = document.getElementById("toolbar-status");
    if (status) {
      const count = this.unsavedChanges.size;
      if (count > 0) {
        status.textContent = `${count} unsaved change${count > 1 ? "s" : ""}`;
        status.className = "toolbar-status unsaved";
      } else {
        status.textContent = "All changes saved";
        status.className = "toolbar-status saved";
      }
    }
  }

  /**
   * Discard all changes
   */
  discardAllChanges() {
    const confirmed = confirm("Discard all unsaved changes?");
    if (!confirmed) return;

    this.unsavedChanges.clear();
    this.updateGenerationUI(); // Refresh to original state
    StatusManager.showInfo("Changes discarded");
  }

  /**
   * Clean up editing handlers
   */
  cleanupEditingHandlers() {
    this.eventHandlers.forEach(({ element, handlers }) => {
      handlers.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventHandlers.clear();
  }

  // ... (rest of the existing methods remain the same)

  /**
   * Render empty state
   */
  renderEmptyState(container) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="sparkles" class="empty-icon"></i>
        <p>No chunks available for content generation.</p>
        <p>Please go back to the Chunking tab and create some chunks first.</p>
        <div class="empty-actions">
          <button class="btn btn-secondary" onclick="app.tabManager.switchTab('chunking')">
            <i data-lucide="arrow-left"></i>
            Back to Chunking
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render generation view
   */
  renderGenerationView(container, chunks) {
    const sortedChunks = chunks.sort((a, b) => a.order - b.order);

    container.innerHTML = `
      <div class="generation-header">
        <div class="generation-stats">
          ${this.renderGenerationStats(chunks)}
        </div>
        <div class="generation-actions">
          <button class="btn btn-secondary" onclick="generationUIController.generateSelected()">
            <i data-lucide="zap"></i>
            Generate Selected
          </button>
          <button class="btn btn-primary" onclick="generationUIController.generateAllContent()">
            <i data-lucide="sparkles"></i>
            Generate All Content
          </button>
          <button class="btn btn-success" onclick="generationUIController.saveAllChanges()" id="saveAllBtn" disabled>
            <i data-lucide="save"></i>
            Save All Changes
          </button>
        </div>
      </div>
      <div class="generation-filters">
        ${this.renderGenerationFilters()}
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
   * Render generation statistics
   */
  renderGenerationStats(chunks) {
    const total = chunks.length;
    const generated = chunks.filter((chunk) => chunk.generatedContent).length;
    const pending = total - generated;
    const progress = total > 0 ? Math.round((generated / total) * 100) : 0;

    return `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Slides</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${generated}</div>
          <div class="stat-label">Generated</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${pending}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${progress}%</div>
          <div class="stat-label">Complete</div>
        </div>
      </div>
    `;
  }

  /**
   * Render generation filters
   */
  renderGenerationFilters() {
    return `
      <div class="filter-controls">
        <div class="filter-group">
          <label>Show:</label>
          <select id="generationFilter" onchange="generationUIController.applyFilter(this.value)">
            <option value="all">All Slides</option>
            <option value="generated">Generated Only</option>
            <option value="pending">Pending Only</option>
            <option value="locked">Locked Only</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Type:</label>
          <select id="typeFilter" onchange="generationUIController.applyFilter()">
            <option value="all">All Types</option>
            ${CONFIG.SLIDE_TYPES.map(
              (type) => `<option value="${type.value}">${type.label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="filter-group">
          <button class="btn btn-secondary btn-sm" onclick="generationUIController.clearFilters()">
            <i data-lucide="x"></i>
            Clear Filters
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render generation item for each chunk
   */
  renderGenerationItem(chunk) {
    const hasContent = !!chunk.generatedContent;
    const statusClass = hasContent ? "has-content" : "no-content";
    const isProcessing = this.contentGenerator.currentlyGenerating?.has(
      chunk.id
    );

    return `
      <div class="generation-item ${statusClass} ${
      chunk.isLocked ? "locked" : ""
    } ${isProcessing ? "processing" : ""}" 
           data-chunk-id="${chunk.id}" 
           data-slide-type="${chunk.slideType}"
           data-status="${hasContent ? "generated" : "pending"}">
        <div class="generation-header">
          <div class="chunk-info">
            <div class="chunk-selection">
              <input type="checkbox" class="generation-checkbox" data-chunk-id="${
                chunk.id
              }"
                     onchange="generationUIController.toggleGenerationSelection('${
                       chunk.id
                     }', this.checked)">
            </div>
            <div class="chunk-details">
              <h3 class="chunk-title">${this.escapeHtml(chunk.title)}</h3>
              <div class="chunk-meta">
                <span class="slide-type-badge">${this.getSlideTypeLabel(
                  chunk.slideType
                )}</span>
                <span class="content-status ${
                  hasContent ? "generated" : "pending"
                }">
                  ${
                    isProcessing
                      ? "Generating..."
                      : hasContent
                      ? "Content Generated"
                      : "Pending Generation"
                  }
                </span>
                ${
                  chunk.isLocked
                    ? '<span class="locked-badge"><i data-lucide="lock"></i> Locked</span>'
                    : ""
                }
              </div>
            </div>
          </div>
          <div class="generation-controls">
            <button class="btn btn-secondary btn-sm" 
                    onclick="generationUIController.switchSlideType('${
                      chunk.id
                    }')" 
                    title="Change slide type"
                    ${chunk.isLocked ? "disabled" : ""}>
              <i data-lucide="shuffle"></i>
            </button>
            <button class="btn btn-primary btn-sm" 
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
   * Render slide preview
   */
  renderSlidePreview(chunk) {
    if (window.slideRenderer) {
      return window.slideRenderer.renderSlide(chunk, true); // TRUE for editable
    } else {
      return this.renderBasicSlidePreview(chunk);
    }
  }

  /**
   * Render basic slide preview (fallback)
   */
  renderBasicSlidePreview(chunk) {
    if (!chunk.generatedContent) {
      return `
        <div class="empty-slide-preview">
          <i data-lucide="file-text"></i>
          <p>Click "Generate" to create content for this slide</p>
        </div>
      `;
    }

    return `
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

    // Enable/disable save all button based on unsaved changes
    const saveAllBtn = document.getElementById("saveAllBtn");
    if (saveAllBtn) {
      saveAllBtn.disabled = this.unsavedChanges.size === 0;
    }
  }

  // ... (rest of the existing methods remain the same: generateChunkContent,
  // regenerateChunkContent, generateAllContent, etc.)

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
   * Switch slide type for a chunk
   */
  async switchSlideType(chunkId) {
    const chunk = this.getChunkById(chunkId);
    if (!chunk) return;

    const newType = await this.showSlideTypeSelector(chunk.slideType);
    if (newType && newType !== chunk.slideType) {
      if (this.contentGenerator) {
        await this.contentGenerator.changeSlideTypeAndRegenerate(
          chunkId,
          newType
        );
      }
    }
  }

  /**
   * Show slide type selector modal
   */
  async showSlideTypeSelector(currentType) {
    return new Promise((resolve) => {
      const modalId = `slide-type-modal-${Date.now()}`;
      const options = CONFIG.SLIDE_TYPES.map(
        (type) =>
          `<option value="${type.value}" ${
            type.value === currentType ? "selected" : ""
          }>${type.label}</option>`
      ).join("");

      const modal = document.createElement("div");
      modal.className = "slide-type-modal";
      modal.id = modalId;
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Change Slide Type</h3>
            <button class="modal-close" data-action="cancel">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="slideTypeSelect-${modalId}">Select new slide type:</label>
              <select id="slideTypeSelect-${modalId}" class="form-select">
                ${options}
              </select>
            </div>
            <div class="slide-type-preview" id="preview-${modalId}">
              <!-- Preview will be updated when selection changes -->
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button class="btn btn-primary" data-action="confirm">Change Type</button>
          </div>
        </div>
      `;

      // Add styles
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 1000;
      `;

      const cleanup = () => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      };

      modal.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        if (action === "cancel") {
          cleanup();
          resolve(null);
        } else if (action === "confirm") {
          const value = document.getElementById(
            `slideTypeSelect-${modalId}`
          ).value;
          cleanup();
          resolve(value);
        } else if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      });

      document.body.appendChild(modal);

      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 30000);
    });
  }

  /**
   * Toggle generation selection
   */
  toggleGenerationSelection(chunkId, isSelected) {
    const checkbox = document.querySelector(
      `input[data-chunk-id="${chunkId}"].generation-checkbox`
    );
    if (checkbox) {
      checkbox.checked = isSelected;
    }

    this.updateBulkGenerationActions();
  }

  /**
   * Update bulk generation actions
   */
  updateBulkGenerationActions() {
    const selectedCount = document.querySelectorAll(
      ".generation-checkbox:checked"
    ).length;

    const generateSelectedBtn = document.querySelector(
      'button[onclick*="generateSelected"]'
    );
    if (generateSelectedBtn) {
      generateSelectedBtn.disabled = selectedCount === 0;
      generateSelectedBtn.innerHTML = `
        <i data-lucide="zap"></i>
        Generate Selected${selectedCount > 0 ? ` (${selectedCount})` : ""}
      `;
    }
  }

  /**
   * Apply filters to generation items
   */
  applyFilter(statusFilter = null) {
    const status =
      statusFilter ||
      document.getElementById("generationFilter")?.value ||
      "all";
    const type = document.getElementById("typeFilter")?.value || "all";

    const items = document.querySelectorAll(".generation-item");

    items.forEach((item) => {
      let show = true;

      // Status filter
      if (status !== "all") {
        const itemStatus = item.dataset.status;
        const isLocked = item.classList.contains("locked");

        switch (status) {
          case "generated":
            show = itemStatus === "generated";
            break;
          case "pending":
            show = itemStatus === "pending";
            break;
          case "locked":
            show = isLocked;
            break;
        }
      }

      // Type filter
      if (show && type !== "all") {
        const itemType = item.dataset.slideType;
        show = itemType === type;
      }

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

    // Could show "Showing X of Y slides" message
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
          /* Copy relevant styles from main app */
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

    // Remove toolbar
    const toolbar = document.getElementById("editing-toolbar");
    if (toolbar) {
      toolbar.remove();
    }

    console.log("GenerationUIController cleaned up");
  }
}

// Make available globally
window.generationUIController = null;
