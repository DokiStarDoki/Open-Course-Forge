/**
 * Chunk UI Controller - Manages chunk display and user interactions
 * FIXED: Meatball menu, side-by-side layout, generated content display
 */
class ChunkUIController {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.chunkManager = null; // Will be set later
    this.currentFilter = "all";
    this.sortOrder = "order";

    // Auto-save system for inline editing
    this.autoSaveTimeouts = {};
    this.editingSession = new Map();

    this.bindEvents();
  }

  /**
   * Initialize the controller
   */
  initialize() {
    this.renderChunks();
    this.setupEventListeners();
  }

  /**
   * Set chunk manager reference
   */
  setChunkManager(chunkManager) {
    this.chunkManager = chunkManager;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // State change listeners
    this.stateManager.subscribe("chunks", this.renderChunks.bind(this));

    // Custom event listeners
    this.eventSystem.on("chunk:added", this.handleChunkAdded.bind(this));
    this.eventSystem.on("chunk:removed", this.handleChunkRemoved.bind(this));
    this.eventSystem.on("chunk:moved", this.handleChunkMoved.bind(this));
    this.eventSystem.on(
      "chunk:lock-toggled",
      this.handleChunkLockToggled.bind(this)
    );
    this.eventSystem.on(
      "chunk:type-changed",
      this.handleChunkTypeChanged.bind(this)
    );
  }

  /**
   * Setup DOM event listeners
   */
  setupEventListeners() {
    // Filter controls
    const filterButtons = document.querySelectorAll(".chunk-filter-btn");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setFilter(e.target.dataset.filter);
      });
    });

    // Sort controls
    const sortSelect = document.getElementById("chunkSortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.setSortOrder(e.target.value);
      });
    }

    // Add chunk button
    const addChunkBtn = document.getElementById("addChunkBtn");
    if (addChunkBtn) {
      addChunkBtn.addEventListener("click", () => {
        if (this.chunkManager) {
          this.chunkManager.addNewChunk();
        }
      });
    }

    // FIXED: Global click handler to close dropdowns
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".chunk-actions-dropdown")) {
        this.closeAllDropdowns();
      }
    });
  }

  /**
   * Render chunks list
   */
  renderChunks() {
    const container = document.getElementById("chunksContainer");
    if (!container) return;

    const chunks = this.stateManager.getState("chunks") || [];

    if (chunks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="package"></i>
          <h3>No chunks available</h3>
          <p>Generate chunks from your course content or add chunks manually</p>
          <button class="btn btn-primary" onclick="window.chunkUIController.addNewChunk()">
            <i data-lucide="plus"></i> Add New Chunk
          </button>
        </div>
      `;

      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
      return;
    }

    // Filter and sort chunks
    const filteredChunks = this.filterChunks(chunks);
    const sortedChunks = this.sortChunks(filteredChunks);

    // Render chunks
    const chunksHTML = sortedChunks
      .map((chunk) => this.renderChunkCard(chunk))
      .join("");

    container.innerHTML = chunksHTML;

    // Initialize Lucide icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    // Update summary
    this.updateChunksSummary(chunks);
  }

  /**
   * Filter chunks based on current filter
   */
  filterChunks(chunks) {
    switch (this.currentFilter) {
      case "locked":
        return chunks.filter((chunk) => chunk.isLocked);
      case "generated":
        return chunks.filter((chunk) => chunk.generatedContent);
      case "pending":
        return chunks.filter((chunk) => !chunk.generatedContent);
      default:
        return chunks;
    }
  }

  /**
   * Sort chunks based on current sort order
   */
  sortChunks(chunks) {
    switch (this.sortOrder) {
      case "title":
        return chunks.sort((a, b) => a.title.localeCompare(b.title));
      case "type":
        return chunks.sort((a, b) => a.slideType.localeCompare(b.slideType));
      case "order":
      default:
        return chunks.sort((a, b) => a.order - b.order);
    }
  }

  /**
   * Render individual chunk card
   */
  renderChunkCard(chunk) {
    const slideTypeOptions = CONFIG.SLIDE_TYPES.map((type) => {
      const selected = type.value === chunk.slideType ? "selected" : "";
      return `<option value="${type.value}" ${selected}>${type.label}</option>`;
    }).join("");

    const statusBadge = chunk.isLocked
      ? '<span class="badge badge-warning">Locked</span>'
      : chunk.generatedContent
      ? '<span class="badge badge-success">Generated</span>'
      : '<span class="badge badge-secondary">Pending</span>';

    return `
      <div class="chunk-card ${
        chunk.isLocked ? "locked" : ""
      }" data-chunk-id="${chunk.id}">
        <div class="chunk-header">
          <div class="chunk-title-section">
            <input type="text" 
                   class="chunk-title-input" 
                   value="${this.escapeHtml(chunk.title)}"
                   onchange="window.chunkUIController.updateChunkTitle('${
                     chunk.id
                   }', this.value)"
                   onkeyup="window.chunkUIController.validateChunkTitle(this)"
                   ${chunk.isLocked ? "disabled" : ""}>
            ${statusBadge}
          </div>
          <div class="chunk-controls">
            <button class="btn btn-sm btn-secondary" 
                    onclick="window.chunkUIController.toggleChunkLock('${
                      chunk.id
                    }')"
                    title="${chunk.isLocked ? "Unlock" : "Lock"} chunk">
              <i data-lucide="${chunk.isLocked ? "lock" : "unlock"}"></i>
            </button>
            <select class="form-select chunk-type-select" 
                    onchange="window.chunkUIController.changeChunkType('${
                      chunk.id
                    }', this.value)"
                    ${chunk.isLocked ? "disabled" : ""}>
              ${slideTypeOptions}
            </select>
            <div class="chunk-actions-dropdown">
              <button class="btn btn-secondary btn-sm dropdown-toggle" 
                      onclick="window.chunkUIController.toggleChunkActions('${
                        chunk.id
                      }', this)"
                      type="button">
                <i data-lucide="more-horizontal"></i>
              </button>
              <div class="dropdown-menu" id="actions-${chunk.id}">
                <button onclick="window.chunkUIController.editChunk('${
                  chunk.id
                }')">
                  <i data-lucide="edit-3"></i> Edit Content
                </button>
                <button onclick="window.chunkUIController.duplicateChunk('${
                  chunk.id
                }')">
                  <i data-lucide="copy"></i> Duplicate
                </button>
                <button onclick="window.chunkUIController.moveChunkUp('${
                  chunk.id
                }')">
                  <i data-lucide="arrow-up"></i> Move Up
                </button>
                <button onclick="window.chunkUIController.moveChunkDown('${
                  chunk.id
                }')">
                  <i data-lucide="arrow-down"></i> Move Down
                </button>
                <hr>
                <button onclick="window.chunkUIController.removeChunk('${
                  chunk.id
                }')" class="danger">
                  <i data-lucide="trash-2"></i> Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        ${this.renderChunkContent(chunk)}
      </div>
    `;
  }

  /**
   * FIXED: Render chunk content preview with side-by-side layout
   */
  renderChunkContent(chunk) {
    if (!chunk.sourceContent && !chunk.generatedContent && !chunk.groundTruth) {
      return "";
    }

    // FIXED: Create side-by-side layout for source and ground truth
    const sourceAndGroundTruthRow = this.renderSourceAndGroundTruthRow(chunk);

    return `
      <div class="chunk-content-preview">
        ${sourceAndGroundTruthRow}
      </div>
    `;
  }

  /**
   * NEW: Render source and ground truth in side-by-side layout
   */
  renderSourceAndGroundTruthRow(chunk) {
    const sourceContent = chunk.sourceContent
      ? `<div class="chunk-source-preview">
        <strong>Source:</strong> ${this.escapeHtml(
          chunk.sourceContent.substring(0, 200)
        )}${chunk.sourceContent.length > 200 ? "..." : ""}
      </div>`
      : "";

    const groundTruthContent = `
      <div class="chunk-ground-truth-section">
        <div class="ground-truth-header">
          <strong><i data-lucide="target"></i> Ground Truth:</strong>
        </div>
        <div class="ground-truth-content ${
          chunk.groundTruth && chunk.groundTruth.trim()
            ? "has-content"
            : "empty"
        }" 
             contenteditable="true"
             data-chunk-id="${chunk.id}"
             data-field="groundTruth"
             onblur="window.chunkUIController.saveInlineEdit(this)"
             onkeydown="window.chunkUIController.handleInlineEditKeydown(event, this)"
             onpaste="window.chunkUIController.handlePaste(event, this)"
             placeholder="Describe what this slide should cover and its purpose...">
          ${this.escapeHtml(chunk.groundTruth || "")}
        </div>
      </div>
    `;

    return `
      <div class="chunk-content-row">
        <div class="chunk-content-left">
          ${groundTruthContent}
        </div>
        <div class="chunk-content-right">
        ${sourceContent}
          
        </div>
      </div>
    `;
  }

  /**
   * FIXED: Save inline edit for ground truth
   */
  saveInlineEdit(element) {
    const chunkId = element.dataset.chunkId;
    const field = element.dataset.field;

    if (!chunkId || !field) return;

    const sessionKey = `${chunkId}-${field}`;
    const session = this.editingSession.get(sessionKey);

    if (!session) {
      // No editing session, create one with current value
      const currentValue = element.textContent || "";
      this.editingSession.set(sessionKey, {
        originalValue: currentValue,
        startTime: Date.now(),
      });
    }

    // Clear any pending auto-save
    if (this.autoSaveTimeouts[sessionKey]) {
      clearTimeout(this.autoSaveTimeouts[sessionKey]);
    }

    // Get current value
    const newValue = (element.textContent || "").trim();
    const sessionData = this.editingSession.get(sessionKey);
    const hasChanged = newValue !== sessionData.originalValue;

    // Remove editing class
    element.classList.remove("editing");

    if (hasChanged) {
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
   * Handle keydown events during inline editing
   */
  handleInlineEditKeydown(event, element) {
    const chunkId = element.dataset.chunkId;
    const field = element.dataset.field;

    if (!chunkId || !field) return;

    const sessionKey = `${chunkId}-${field}`;

    // Initialize editing session if not exists
    if (!this.editingSession.has(sessionKey)) {
      this.editingSession.set(sessionKey, {
        originalValue: element.textContent || "",
        startTime: Date.now(),
      });
      element.classList.add("editing");
    }

    // Escape key: cancel editing
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancelEditing(chunkId, field, element);
      return;
    }

    // Auto-save on typing (debounced)
    if (this.autoSaveTimeouts[sessionKey]) {
      clearTimeout(this.autoSaveTimeouts[sessionKey]);
    }

    this.autoSaveTimeouts[sessionKey] = setTimeout(() => {
      const newValue = (element.textContent || "").trim();
      const session = this.editingSession.get(sessionKey);

      if (session && newValue !== session.originalValue) {
        this.updateChunkContent(chunkId, field, newValue);
        session.originalValue = newValue; // Update original value

        // Visual feedback
        element.classList.add("auto-saved");
        setTimeout(() => element.classList.remove("auto-saved"), 1000);
      }
    }, 1000); // Auto-save after 1 second of inactivity
  }

  /**
   * Handle paste events for inline editing
   */
  handlePaste(event, element) {
    event.preventDefault();

    // Get plain text from clipboard
    const paste = (event.clipboardData || window.clipboardData).getData("text");

    // Insert plain text at cursor position
    if (document.selection) {
      // IE
      element.focus();
      document.selection.createRange().text = paste;
    } else if (window.getSelection) {
      // Other browsers
      const selection = window.getSelection();
      if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(paste));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  /**
   * Cancel inline editing
   */
  cancelEditing(chunkId, field, element) {
    const sessionKey = `${chunkId}-${field}`;
    const session = this.editingSession.get(sessionKey);

    if (session) {
      // Restore original value
      element.textContent = session.originalValue;
      element.classList.remove("editing");
      this.editingSession.delete(sessionKey);

      // Clear auto-save timeout
      if (this.autoSaveTimeouts[sessionKey]) {
        clearTimeout(this.autoSaveTimeouts[sessionKey]);
        delete this.autoSaveTimeouts[sessionKey];
      }

      if (CONFIG.DEBUG.ENABLED) {
        console.log(`Cancelled editing: ${field}`);
      }
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

    // Handle ground truth updates directly on chunk object
    if (field === "groundTruth") {
      chunk.groundTruth = value;

      // Update the chunk in state
      chunks[chunkIndex] = chunk;
      this.stateManager.setState("chunks", chunks);

      // Visual feedback
      const element = document.querySelector(
        `[data-chunk-id="${chunkId}"][data-field="groundTruth"]`
      );
      if (element) {
        element.classList.add("updated");
        setTimeout(() => element.classList.remove("updated"), 1000);
      }

      StatusManager.showSuccess("Ground truth updated");
    } else {
      console.warn(`Unsupported field for chunk content update: ${field}`);
      return;
    }

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Updated ${field} for chunk ${chunkId}:`, value);
    }

    // Emit update event
    this.eventSystem.emit("chunk:content-updated", {
      chunkId,
      field,
      value,
    });
  }

  /**
   * FIXED: Generate content summary for preview - handles new LLM format
   */
  generateContentSummary(content, slideType) {
    if (!content || typeof content !== "object") {
      return "Invalid content format";
    }

    switch (slideType) {
      case "title":
        return content.header
          ? this.escapeHtml(content.header.substring(0, 100)) + "..."
          : "Title slide content";

      case "courseInfo":
        return content.text
          ? this.escapeHtml(content.text.substring(0, 100)) + "..."
          : "Course information content";

      case "textAndImage":
        return content.text
          ? this.escapeHtml(content.text.substring(0, 100)) + "..."
          : "Text and image content";

      case "textAndBullets":
        const bulletCount = content.bullets ? content.bullets.length : 0;
        return `${bulletCount} bullet points`;

      case "multipleChoice":
        return content.question
          ? this.escapeHtml(content.question.substring(0, 80)) + "..."
          : "Multiple choice question";

      case "iconsWithTitles":
        const iconCount = content.icons ? content.icons.length : 0;
        return `${iconCount} icon items`;

      case "tabs":
        const tabCount = Array.isArray(content) ? content.length : 0;
        return `${tabCount} tabs`;

      case "flipCards":
        const cardCount = Array.isArray(content) ? content.length : 0;
        return `${cardCount} flip cards`;

      case "faq":
        const faqCount = content.items ? content.items.length : 0;
        return `${faqCount} FAQ items`;

      case "popups":
        const popupCount = Array.isArray(content) ? content.length : 0;
        return `${popupCount} popup items`;

      default:
        return "Generated content";
    }
  }

  /**
   * Add new chunk
   */
  addNewChunk() {
    if (this.chunkManager) {
      this.chunkManager.addNewChunk();
    }
  }

  /**
   * Remove a chunk
   */
  removeChunk(chunkId) {
    if (this.chunkManager) {
      this.chunkManager.removeChunk(chunkId);
    }
  }

  /**
   * Duplicate a chunk
   */
  duplicateChunk(chunkId) {
    if (this.chunkManager) {
      this.chunkManager.duplicateChunk(chunkId);
    }
  }

  /**
   * Move chunk up
   */
  moveChunkUp(chunkId) {
    if (this.chunkManager) {
      this.chunkManager.moveChunkUp(chunkId);
    }
  }

  /**
   * Move chunk down
   */
  moveChunkDown(chunkId) {
    if (this.chunkManager) {
      this.chunkManager.moveChunkDown(chunkId);
    }
  }

  /**
   * Update chunk title
   */
  updateChunkTitle(chunkId, newTitle) {
    if (!this.chunkManager) return;
    this.chunkManager.updateChunkTitle(chunkId, newTitle);
  }

  /**
   * Validate chunk title
   */
  validateChunkTitle(input) {
    const title = input.value.trim();

    input.classList.remove("invalid", "valid");

    if (title.length < 3) {
      input.classList.add("invalid");
      input.title = "Title must be at least 3 characters";
    } else if (title.length > 80) {
      input.classList.add("invalid");
      input.title = "Title must be less than 80 characters";
    } else {
      input.classList.add("valid");
      input.title = "";
    }
  }

  /**
   * Toggle chunk lock status
   */
  toggleChunkLock(chunkId) {
    if (!this.chunkManager) return;
    this.chunkManager.toggleChunkLock(chunkId);
  }

  /**
   * Change chunk slide type
   */
  changeChunkType(chunkId, newType) {
    if (!this.chunkManager) return;
    this.chunkManager.changeChunkType(chunkId, newType);
  }

  /**
   * Edit chunk content
   */
  editChunk(chunkId) {
    // Switch to generation tab and focus on this chunk
    if (window.app && window.app.tabManager) {
      window.app.tabManager.switchTab("generation");
    }

    // Scroll to the specific chunk in generation view
    setTimeout(() => {
      const chunkElement = document.querySelector(
        `[data-chunk-id="${chunkId}"]`
      );
      if (chunkElement) {
        chunkElement.scrollIntoView({ behavior: "smooth", block: "center" });
        chunkElement.classList.add("highlight");
        setTimeout(() => chunkElement.classList.remove("highlight"), 2000);
      }
    }, 100);
  }

  /**
   * FIXED: Toggle chunk actions dropdown
   */
  toggleChunkActions(chunkId, button) {
    const dropdown = document.getElementById(`actions-${chunkId}`);
    if (!dropdown) {
      console.error(`Dropdown not found: actions-${chunkId}`);
      return;
    }

    const isOpen = dropdown.classList.contains("show");

    // Close all dropdowns first
    this.closeAllDropdowns();

    // Toggle this dropdown
    if (!isOpen) {
      dropdown.classList.add("show");
      button.setAttribute("aria-expanded", "true");
    }

    // Prevent event propagation
    if (window.event) {
      window.event.stopPropagation();
    }
  }

  /**
   * Close all action dropdowns
   */
  closeAllDropdowns() {
    const dropdowns = document.querySelectorAll(".dropdown-menu");
    const buttons = document.querySelectorAll(".dropdown-toggle");

    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("show");
    });

    buttons.forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  /**
   * Set filter
   */
  setFilter(filter) {
    this.currentFilter = filter;

    // Update filter buttons
    const buttons = document.querySelectorAll(".chunk-filter-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    this.renderChunks();
  }

  /**
   * Set sort order
   */
  setSortOrder(order) {
    this.sortOrder = order;
    this.renderChunks();
  }

  /**
   * Update chunks summary
   */
  updateChunksSummary(chunks) {
    const summaryElement = document.getElementById("chunksSummary");
    if (!summaryElement) return;

    const total = chunks.length;
    const locked = chunks.filter((c) => c.isLocked).length;
    const generated = chunks.filter((c) => c.generatedContent).length;
    const withGroundTruth = chunks.filter(
      (c) => c.groundTruth && c.groundTruth.trim()
    ).length;

    summaryElement.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">Total:</span>
        <span class="summary-value">${total}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Generated:</span>
        <span class="summary-value">${generated}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">With Ground Truth:</span>
        <span class="summary-value">${withGroundTruth}</span>
      </div>
    `;
  }

  /**
   * Handle chunk added event
   */
  handleChunkAdded(data) {
    this.renderChunks();

    // Scroll to the new chunk
    setTimeout(() => {
      const newChunkElement = document.querySelector(
        `[data-chunk-id="${data.chunk.id}"]`
      );
      if (newChunkElement) {
        newChunkElement.scrollIntoView({ behavior: "smooth", block: "center" });
        newChunkElement.classList.add("highlight");
        setTimeout(() => newChunkElement.classList.remove("highlight"), 2000);
      }
    }, 100);
  }

  /**
   * Handle chunk removed event
   */
  handleChunkRemoved(data) {
    this.renderChunks();
  }

  /**
   * Handle chunk moved event
   */
  handleChunkMoved(data) {
    this.renderChunks();
  }

  /**
   * Handle chunk lock toggled event
   */
  handleChunkLockToggled(data) {
    this.renderChunks();
  }

  /**
   * Handle chunk type changed event
   */
  handleChunkTypeChanged(data) {
    this.renderChunks();
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
    // Clear auto-save timeouts
    Object.values(this.autoSaveTimeouts).forEach((timeout) =>
      clearTimeout(timeout)
    );
    this.autoSaveTimeouts = {};

    // Clear editing sessions
    this.editingSession.clear();

    // Remove event listeners
    this.eventSystem.off("chunk:added", this.handleChunkAdded);
    this.eventSystem.off("chunk:removed", this.handleChunkRemoved);
    this.eventSystem.off("chunk:moved", this.handleChunkMoved);
    this.eventSystem.off("chunk:lock-toggled", this.handleChunkLockToggled);
    this.eventSystem.off("chunk:type-changed", this.handleChunkTypeChanged);

    console.log("ChunkUIController cleaned up");
  }
}

// Make available globally
window.ChunkUIController = ChunkUIController;
