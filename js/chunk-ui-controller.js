/**
 * Course Forge MVP - Chunk UI Controller
 * Handles chunk display, interaction, and UI management
 */

class ChunkUIController {
  constructor(stateManager, eventSystem, chunkManager) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.chunkManager = chunkManager;
    this.eventHandlers = new Map();

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("ChunkUIController initialized");
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // React to chunks changes
    this.stateManager.subscribe("chunks", () => {
      this.updateChunksUI();
    });

    // Listen for chunk-related events
    this.eventSystem.on("chunks:generated", () => {
      this.updateChunksUI();
    });

    this.eventSystem.on("chunk:added", () => {
      this.updateChunksUI();
    });

    this.eventSystem.on("chunk:removed", () => {
      this.updateChunksUI();
    });

    this.eventSystem.on("chunk:reordered", () => {
      this.updateChunksUI();
    });
  }

  /**
   * Update chunks UI
   */
  updateChunksUI() {
    const container = document.getElementById("chunksContainer");
    const chunks = this.stateManager.getState("chunks") || [];

    if (!container) return;

    if (chunks.length === 0) {
      this.renderEmptyState(container);
    } else {
      this.renderChunksList(container, chunks);
    }

    // Update proceed button
    this.updateProceedButton(chunks.length);

    // Reinitialize icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  /**
   * Render empty state
   */
  renderEmptyState(container) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="layout" class="empty-icon"></i>
        <p>No chunks generated yet. Click "Rechunk Content" to begin.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" onclick="app.rechunkContent()">
            <i data-lucide="sparkles"></i>
            Generate Chunks
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render chunks list
   */
  renderChunksList(container, chunks) {
    const sortedChunks = chunks.sort((a, b) => a.order - b.order);

    container.innerHTML = `
      <div class="chunks-header">
        <div class="chunks-stats">
          ${this.renderChunksStats(chunks)}
        </div>
        <div class="chunks-actions">
          <button class="btn btn-secondary btn-sm" onclick="chunkUIController.selectAllChunks()">
            <i data-lucide="check-square"></i>
            Select All
          </button>
          <button class="btn btn-secondary btn-sm" onclick="chunkUIController.exportChunks()">
            <i data-lucide="download"></i>
            Export Chunks
          </button>
        </div>
      </div>
      <div class="chunks-container" id="chunksListContainer">
        ${sortedChunks.map((chunk) => this.renderChunkItem(chunk)).join("")}
      </div>
    `;

    // Setup drag and drop for reordering
    const chunksListContainer = document.getElementById("chunksListContainer");
    if (chunksListContainer && this.chunkManager) {
      this.chunkManager.setupDragAndDrop(chunksListContainer);
    }
  }

  /**
   * Render chunks statistics
   */
  renderChunksStats(chunks) {
    const total = chunks.length;
    const locked = chunks.filter((chunk) => chunk.isLocked).length;
    const generated = chunks.filter((chunk) => chunk.generatedContent).length;

    return `
      <div class="stats-row">
        <span class="stat-item">${total} chunks</span>
        <span class="stat-item">${generated} generated</span>
        <span class="stat-item">${locked} locked</span>
      </div>
    `;
  }

  /**
   * Render individual chunk item
   */
  renderChunkItem(chunk) {
    const slideTypeOptions = CONFIG.SLIDE_TYPES.map(
      (type) =>
        `<option value="${type.value}" ${
          chunk.slideType === type.value ? "selected" : ""
        }>${type.label}</option>`
    ).join("");

    return `
      <div class="chunk-item ${chunk.isLocked ? "locked" : ""} ${
      chunk.generatedContent ? "has-content" : ""
    }" 
           data-chunk-id="${chunk.id}" 
           draggable="true">
        <div class="chunk-header">
          <div class="chunk-drag-handle" title="Drag to reorder">
            <i data-lucide="grip-vertical"></i>
          </div>
          <div class="chunk-selection">
            <input type="checkbox" class="chunk-checkbox" data-chunk-id="${
              chunk.id
            }"
                   onchange="chunkUIController.toggleChunkSelection('${
                     chunk.id
                   }', this.checked)">
          </div>
          <div class="chunk-title-container">
            <input type="text" 
                   class="chunk-title-input" 
                   value="${this.escapeHtml(chunk.title)}" 
                   onchange="chunkUIController.updateChunkTitle('${
                     chunk.id
                   }', this.value)"
                   onblur="chunkUIController.validateChunkTitle(this)"
                   ${chunk.isLocked ? "readonly" : ""}>
            <div class="chunk-meta">
              <span class="chunk-time">${chunk.estimatedTime || "2 min"}</span>
              <span class="chunk-status ${
                chunk.generatedContent ? "generated" : "pending"
              }">
                ${chunk.generatedContent ? "Generated" : "Pending"}
              </span>
              ${
                chunk.lastGenerated
                  ? `<span class="chunk-updated" title="Last updated: ${new Date(
                      chunk.lastGenerated
                    ).toLocaleString()}">
                <i data-lucide="clock"></i>
              </span>`
                  : ""
              }
            </div>
          </div>
          <div class="chunk-controls">
            <button class="btn btn-secondary btn-sm" 
                    onclick="chunkUIController.toggleChunkLock('${chunk.id}')" 
                    title="${chunk.isLocked ? "Unlock" : "Lock"} chunk">
              <i data-lucide="${chunk.isLocked ? "lock" : "unlock"}"></i>
            </button>
            <select class="form-select chunk-type-select" 
                    onchange="chunkUIController.changeChunkType('${
                      chunk.id
                    }', this.value)"
                    ${chunk.isLocked ? "disabled" : ""}>
              ${slideTypeOptions}
            </select>
            <div class="chunk-actions-dropdown">
              <button class="btn btn-secondary btn-sm dropdown-toggle" 
                      onclick="chunkUIController.toggleChunkActions('${
                        chunk.id
                      }', this)">
                <i data-lucide="more-horizontal"></i>
              </button>
              <div class="dropdown-menu" id="actions-${chunk.id}">
                <button onclick="chunkUIController.editChunk('${chunk.id}')">
                  <i data-lucide="edit-3"></i> Edit Content
                </button>
                <button onclick="chunkUIController.duplicateChunk('${
                  chunk.id
                }')">
                  <i data-lucide="copy"></i> Duplicate
                </button>
                <button onclick="chunkUIController.moveChunkUp('${chunk.id}')">
                  <i data-lucide="arrow-up"></i> Move Up
                </button>
                <button onclick="chunkUIController.moveChunkDown('${
                  chunk.id
                }')">
                  <i data-lucide="arrow-down"></i> Move Down
                </button>
                <hr>
                <button onclick="chunkUIController.removeChunk('${
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
   * Render chunk content preview
   */
  renderChunkContent(chunk) {
    if (!chunk.sourceContent && !chunk.generatedContent) {
      return "";
    }

    let contentPreview = "";

    if (chunk.sourceContent) {
      const preview = chunk.sourceContent.substring(0, 200);
      contentPreview = `
        <div class="chunk-source-preview">
          <strong>Source:</strong> ${this.escapeHtml(preview)}${
        chunk.sourceContent.length > 200 ? "..." : ""
      }
        </div>
      `;
    }

    if (chunk.generatedContent) {
      const contentSummary = this.generateContentSummary(
        chunk.generatedContent,
        chunk.slideType
      );
      contentPreview += `
        <div class="chunk-generated-preview">
          <strong>Generated:</strong> ${contentSummary}
        </div>
      `;
    }

    return contentPreview
      ? `
      <div class="chunk-content-preview">
        ${contentPreview}
        <div class="chunk-preview-actions">
          <button class="btn-link" onclick="chunkUIController.togglePreviewExpanded('${chunk.id}')">
            <span class="expand-text">Show more</span>
            <i data-lucide="chevron-down"></i>
          </button>
        </div>
      </div>
    `
      : "";
  }

  /**
   * Generate content summary for preview
   */
  generateContentSummary(content, slideType) {
    switch (slideType) {
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
        chunkElement.classList.add("highlighted");
        setTimeout(() => chunkElement.classList.remove("highlighted"), 2000);
      }
    }, 300);
  }

  /**
   * Remove a chunk
   */
  removeChunk(chunkId) {
    if (!this.chunkManager) return;
    this.chunkManager.removeChunk(chunkId);
  }

  /**
   * Duplicate a chunk
   */
  duplicateChunk(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) return;

    const duplicatedChunk = {
      ...chunk,
      id: `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${chunk.title} (Copy)`,
      order: chunks.length,
      isLocked: false,
      generatedContent: null, // Don't copy generated content
      createdAt: new Date().toISOString(),
    };

    chunks.push(duplicatedChunk);
    this.stateManager.setState("chunks", chunks);

    StatusManager.showSuccess("Chunk duplicated");
    this.eventSystem.emit("chunk:duplicated", {
      originalId: chunkId,
      newId: duplicatedChunk.id,
    });
  }

  /**
   * Move chunk up in order
   */
  moveChunkUp(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const currentIndex = chunks.findIndex((c) => c.id === chunkId);

    if (currentIndex > 0) {
      this.swapChunks(chunks, currentIndex, currentIndex - 1);
    }
  }

  /**
   * Move chunk down in order
   */
  moveChunkDown(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const currentIndex = chunks.findIndex((c) => c.id === chunkId);

    if (currentIndex < chunks.length - 1) {
      this.swapChunks(chunks, currentIndex, currentIndex + 1);
    }
  }

  /**
   * Swap two chunks
   */
  swapChunks(chunks, index1, index2) {
    // Swap order values
    const temp = chunks[index1].order;
    chunks[index1].order = chunks[index2].order;
    chunks[index2].order = temp;

    // Sort by order
    chunks.sort((a, b) => a.order - b.order);

    this.stateManager.setState("chunks", chunks);
    StatusManager.showInfo("Chunk moved");
  }

  /**
   * Toggle chunk selection
   */
  toggleChunkSelection(chunkId, isSelected) {
    // Implementation for bulk operations
    const checkbox = document.querySelector(
      `input[data-chunk-id="${chunkId}"]`
    );
    if (checkbox) {
      checkbox.checked = isSelected;
    }

    this.updateBulkActions();
  }

  /**
   * Select all chunks
   */
  selectAllChunks() {
    const checkboxes = document.querySelectorAll(".chunk-checkbox");
    const allSelected = Array.from(checkboxes).every((cb) => cb.checked);

    checkboxes.forEach((checkbox) => {
      checkbox.checked = !allSelected;
    });

    this.updateBulkActions();
  }

  /**
   * Update bulk actions UI
   */
  updateBulkActions() {
    const selectedCount = document.querySelectorAll(
      ".chunk-checkbox:checked"
    ).length;

    // Show/hide bulk actions based on selection
    const bulkActions = document.querySelector(".bulk-actions");
    if (bulkActions) {
      bulkActions.style.display = selectedCount > 0 ? "flex" : "none";
      bulkActions.querySelector(
        ".selected-count"
      ).textContent = `${selectedCount} selected`;
    }
  }

  /**
   * Toggle chunk actions dropdown
   */
  toggleChunkActions(chunkId, button) {
    const dropdown = document.getElementById(`actions-${chunkId}`);
    if (!dropdown) return;

    // Close other dropdowns
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      if (menu !== dropdown) {
        menu.classList.remove("show");
      }
    });

    dropdown.classList.toggle("show");

    // Close dropdown when clicking outside
    const closeHandler = (e) => {
      if (!button.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
        document.removeEventListener("click", closeHandler);
      }
    };

    if (dropdown.classList.contains("show")) {
      setTimeout(() => {
        document.addEventListener("click", closeHandler);
      }, 0);
    }
  }

  /**
   * Toggle preview expanded state
   */
  togglePreviewExpanded(chunkId) {
    const preview = document.querySelector(
      `[data-chunk-id="${chunkId}"] .chunk-content-preview`
    );
    if (!preview) return;

    const isExpanded = preview.classList.contains("expanded");
    preview.classList.toggle("expanded");

    const button = preview.querySelector(".expand-text");
    const icon = preview.querySelector("i");

    if (button && icon) {
      button.textContent = isExpanded ? "Show more" : "Show less";
      icon.setAttribute(
        "data-lucide",
        isExpanded ? "chevron-down" : "chevron-up"
      );

      // Re-initialize icon
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
    }
  }

  /**
   * Export chunks to JSON
   */
  exportChunks() {
    const chunks = this.stateManager.getState("chunks") || [];
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      chunks: chunks,
      stats: {
        total: chunks.length,
        locked: chunks.filter((c) => c.isLocked).length,
        generated: chunks.filter((c) => c.generatedContent).length,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `chunks-${timestamp}.json`;

    FileProcessor.downloadAsFile(jsonString, filename, "application/json");
    StatusManager.showSuccess("Chunks exported");
  }

  /**
   * Update proceed button state
   */
  updateProceedButton(chunkCount) {
    const proceedBtn = document.getElementById("proceedToGenerationBtn");
    if (proceedBtn) {
      proceedBtn.disabled = chunkCount === 0;
    }
  }

  /**
   * Get selected chunks
   */
  getSelectedChunks() {
    const selectedIds = Array.from(
      document.querySelectorAll(".chunk-checkbox:checked")
    ).map((cb) => cb.dataset.chunkId);

    const chunks = this.stateManager.getState("chunks") || [];
    return chunks.filter((chunk) => selectedIds.includes(chunk.id));
  }

  /**
   * Bulk operations
   */
  bulkLockChunks() {
    const selected = this.getSelectedChunks();
    selected.forEach((chunk) => {
      if (!chunk.isLocked) {
        this.chunkManager.toggleChunkLock(chunk.id);
      }
    });
    StatusManager.showSuccess(`Locked ${selected.length} chunks`);
  }

  bulkUnlockChunks() {
    const selected = this.getSelectedChunks();
    selected.forEach((chunk) => {
      if (chunk.isLocked) {
        this.chunkManager.toggleChunkLock(chunk.id);
      }
    });
    StatusManager.showSuccess(`Unlocked ${selected.length} chunks`);
  }

  bulkDeleteChunks() {
    const selected = this.getSelectedChunks();
    if (selected.length === 0) return;

    const confirmed = confirm(
      `Delete ${selected.length} selected chunks? This cannot be undone.`
    );
    if (confirmed) {
      selected.forEach((chunk) => {
        this.chunkManager.removeChunk(chunk.id);
      });
      StatusManager.showSuccess(`Deleted ${selected.length} chunks`);
    }
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
    // Remove event handlers
    this.eventHandlers.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // Close any open dropdowns
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("show");
    });

    console.log("ChunkUIController cleaned up");
  }
}
