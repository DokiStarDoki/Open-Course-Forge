/**
 * Generation UI Controller - Manages content generation display and interactions
 * FIXED: Generate All button visibility, loading notifications, and copy content functionality
 */
class GenerationUIController {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.contentGenerator = null; // Will be set later
    this.autoSaveTimeouts = {};
    this.editingSession = new Map();

    this.bindEvents();
  }

  /**
   * Initialize the controller
   */
  initialize() {
    this.updateGenerationUI();
    this.setupEventListeners();
  }

  /**
   * Set content generator reference
   */
  setContentGenerator(contentGenerator) {
    this.contentGenerator = contentGenerator;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // State change listeners
    this.stateManager.subscribe("chunks", this.updateGenerationUI.bind(this));

    // Custom event listeners
    this.eventSystem.on(
      "content:generated",
      this.handleContentGenerated.bind(this)
    );
    this.eventSystem.on(
      "content:generation-failed",
      this.handleGenerationFailed.bind(this)
    );
    this.eventSystem.on("content:reset", this.handleContentReset.bind(this));

    // FIXED: Add batch completion listener to clear loading states
    this.eventSystem.on(
      "content:batch-generated",
      this.handleBatchCompleted.bind(this)
    );
  }

  /**
   * Setup DOM event listeners
   */
  setupEventListeners() {
    // FIXED: Generate all button - ensure proper event binding and visibility
    const generateAllBtn = document.getElementById("generateAllBtn");
    if (generateAllBtn) {
      // Remove any existing listeners to prevent duplicates
      generateAllBtn.removeEventListener("click", this.generateAllContent);
      generateAllBtn.addEventListener("click", () => {
        console.log("Generate All button clicked");
        this.generateAllContent();
      });

      // FIXED: Ensure button is visible
      generateAllBtn.style.display = "inline-flex";
      generateAllBtn.disabled = false;
    } else {
      console.warn("Generate All button not found in DOM");
    }

    // Generate selected button
    const generateSelectedBtn = document.getElementById("generateSelectedBtn");
    if (generateSelectedBtn) {
      generateSelectedBtn.addEventListener("click", () => {
        this.generateSelected();
      });
    }

    // Select all checkbox
    const selectAllCheckbox = document.getElementById("selectAllSlides");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        this.toggleSelectAll(e.target.checked);
      });
    }

    // Filter controls
    const generationFilter = document.getElementById("generationFilter");
    if (generationFilter) {
      generationFilter.addEventListener("change", () => {
        this.applyFilter();
      });
    }

    const typeFilter = document.getElementById("typeFilter");
    if (typeFilter) {
      typeFilter.addEventListener("change", () => {
        this.applyFilter();
      });
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        this.clearFilters();
      });
    }

    // FIXED: Global click handler for dropdown management
    document.addEventListener("click", (e) => {
      // Close all dropdowns if click is outside
      if (!e.target.closest(".generation-actions-dropdown")) {
        this.closeAllDropdowns();
      }
    });
  }

  /**
   * Update generation UI
   */
  updateGenerationUI() {
    const container = document.getElementById("generationContainer");
    if (!container) return;

    const chunks = this.stateManager.getState("chunks") || [];

    if (chunks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="layout"></i>
          <h3>No slides available</h3>
          <p>Create chunks in the previous step to generate content</p>
        </div>
      `;

      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
      return;
    }

    // Render generation items
    const generationHTML = chunks
      .map((chunk) => this.renderGenerationItem(chunk))
      .join("");

    container.innerHTML = generationHTML;

    // Initialize Lucide icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    // Update statistics
    this.updateGenerationStats(chunks);

    // Setup interactions
    this.setupGenerationInteractions();

    // FIXED: Update Generate All button state
    this.updateGenerateAllButton(chunks);
  }

  /**
   * FIXED: Update Generate All button visibility and state
   */
  updateGenerateAllButton(chunks) {
    const generateAllBtn = document.getElementById("generateAllBtn");
    if (!generateAllBtn) return;

    const pendingChunks = chunks.filter(
      (chunk) => !chunk.generatedContent && !chunk.isLocked
    );

    // Show/hide button based on pending chunks
    if (pendingChunks.length > 0) {
      generateAllBtn.style.display = "inline-flex";
      generateAllBtn.disabled = false;
      generateAllBtn.textContent = `Generate All (${pendingChunks.length})`;
    } else {
      generateAllBtn.style.display = "inline-flex";
      generateAllBtn.disabled = true;
      generateAllBtn.textContent = "All Generated";
    }
  }

  /**
   * Render individual generation item
   */
  renderGenerationItem(chunk) {
    const hasContent = chunk.generatedContent !== null;
    const isProcessing =
      this.contentGenerator &&
      this.contentGenerator.currentlyGenerating.has(chunk.id);

    const generationDate = chunk.lastGenerated
      ? new Date(chunk.lastGenerated).toLocaleDateString()
      : null;

    return `
      <div class="generation-item ${hasContent ? "has-content" : "pending"} ${
      isProcessing ? "processing" : ""
    } ${chunk.isLocked ? "locked" : ""}" 
           data-chunk-id="${chunk.id}" 
           data-slide-type="${chunk.slideType}"
           data-generation-status="${hasContent ? "generated" : "pending"}">
        <div class="generation-header">
          <div class="generation-select">
            <input type="checkbox" 
                   class="generation-checkbox" 
                   data-chunk-id="${chunk.id}"
                   ${chunk.isLocked ? "disabled" : ""}>
          </div>
          <div class="generation-info">
            <h3 class="generation-title">${this.escapeHtml(chunk.title)}</h3>
            <div class="generation-meta">
              <span class="slide-type">${this.getSlideTypeLabel(
                chunk.slideType
              )}</span>
              ${
                chunk.isLocked
                  ? '<span class="badge badge-warning">Locked</span>'
                  : ""
              }
              ${
                hasContent
                  ? '<span class="badge badge-success">Generated</span>'
                  : '<span class="badge badge-secondary">Pending</span>'
              }
              ${
                generationDate
                  ? `<span class="generation-date">Generated: ${generationDate}</span>`
                  : ""
              }
            </div>
          </div>
          <div class="generation-actions">
            <button class="btn btn-primary generation-btn" 
                    onclick="window.generationUIController.${
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
                      onclick="window.generationUIController.toggleGenerationActions('${
                        chunk.id
                      }', this)"
                      type="button">
                <i data-lucide="more-horizontal"></i>
              </button>
              <div class="dropdown-menu" id="gen-actions-${chunk.id}">
                <button onclick="window.generationUIController.copySlideContent('${
                  chunk.id
                }')" ${!hasContent ? "disabled" : ""}>
                  <i data-lucide="copy"></i> Copy Content
                </button>
                <button onclick="window.generationUIController.copySlideTranscript('${
                  chunk.id
                }')" ${!hasContent ? "disabled" : ""}>
                  <i data-lucide="volume-2"></i> Copy Transcript
                </button>
                <button onclick="window.generationUIController.previewSlide('${
                  chunk.id
                }')" ${!hasContent ? "disabled" : ""}>
                  <i data-lucide="eye"></i> Preview Slide
                </button>
                <hr>
                <button onclick="window.generationUIController.resetSlideContent('${
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
             onblur="window.generationUIController.saveInlineEdit(this)"
             onkeydown="window.generationUIController.handleInlineEditKeydown(event, this)"
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
   * Update generation statistics
   */
  updateGenerationStats(chunks) {
    const statsElement = document.getElementById("generationStats");
    if (!statsElement) return;

    const stats = {
      total: chunks.length,
      generated: chunks.filter((c) => c.generatedContent).length,
      pending: chunks.filter((c) => !c.generatedContent && !c.isLocked).length,
      locked: chunks.filter((c) => c.isLocked).length,
    };

    statsElement.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Slides:</span>
        <span class="stat-value">${stats.total}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Generated:</span>
        <span class="stat-value">${stats.generated}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Pending:</span>
        <span class="stat-value">${stats.pending}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Locked:</span>
        <span class="stat-value">${stats.locked}</span>
      </div>
    `;
  }

  /**
   * Toggle select all slides
   */
  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll(
      ".generation-checkbox:not(:disabled)"
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
    });
  }

  /**
   * Apply filter to generation items
   */
  applyFilter() {
    const generationFilter = document.getElementById("generationFilter");
    const typeFilter = document.getElementById("typeFilter");

    const generationStatus = generationFilter ? generationFilter.value : "all";
    const slideType = typeFilter ? typeFilter.value : "all";

    const items = document.querySelectorAll(".generation-item");

    items.forEach((item) => {
      const itemStatus = item.dataset.generationStatus;
      const itemType = item.dataset.slideType;

      const statusMatch =
        generationStatus === "all" || itemStatus === generationStatus;
      const typeMatch = slideType === "all" || itemType === slideType;

      item.style.display = statusMatch && typeMatch ? "block" : "none";
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
   * FIXED: Toggle generation actions dropdown with proper event handling
   */
  toggleGenerationActions(chunkId, button) {
    console.log("Toggle generation actions called", chunkId);

    const dropdown = document.getElementById(`gen-actions-${chunkId}`);
    if (!dropdown) {
      console.error("Dropdown not found:", `gen-actions-${chunkId}`);
      return;
    }

    // Close other dropdowns first
    this.closeAllDropdowns();

    // Toggle this dropdown
    const isCurrentlyOpen = dropdown.classList.contains("show");

    if (!isCurrentlyOpen) {
      dropdown.classList.add("show");
      button.setAttribute("aria-expanded", "true");

      console.log("Dropdown opened for chunk:", chunkId);
    }

    // Prevent event bubbling
    if (window.event) {
      window.event.stopPropagation();
    }
  }

  /**
   * FIXED: Close all dropdowns properly
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
   * FIXED: Copy slide content to clipboard - only text content in plain text format
   */
  async copySlideContent(chunkId) {
    const chunk = this.getChunkById(chunkId);
    if (!chunk || !chunk.generatedContent) {
      StatusManager.showWarning("No content available to copy");
      return;
    }

    try {
      const content = chunk.generatedContent;
      let textContent = "";

      // Extract only text content based on slide type, excluding audio script
      switch (chunk.slideType) {
        case "title":
          textContent = `${content.header || ""}\n\n${content.text || ""}`;
          break;

        case "courseInfo":
          textContent = `${content.header || ""}\n\n${content.text || ""}`;
          if (content.duration) {
            textContent += `\n\nDuration: ${content.duration}`;
          }
          if (content.audience) {
            textContent += `\nTarget Audience: ${content.audience}`;
          }
          if (content.objectives && content.objectives.length > 0) {
            textContent += "\n\nLearning Objectives:\n";
            content.objectives.forEach((obj) => {
              textContent += `• ${obj}\n`;
            });
          }
          break;

        case "textAndImage":
          textContent = `${content.header || ""}\n\n${content.text || ""}`;
          break;

        case "textAndBullets":
          textContent = `${content.header || ""}\n\n${content.text || ""}`;
          if (content.bullets && content.bullets.length > 0) {
            textContent += "\n\n";
            content.bullets.forEach((bullet) => {
              textContent += `• ${bullet}\n`;
            });
          }
          break;

        case "iconsWithTitles":
          textContent = `${content.header || ""}`;
          if (content.icons && content.icons.length > 0) {
            textContent += "\n\n";
            content.icons.forEach((icon) => {
              textContent += `${icon.title}\n${icon.description}\n\n`;
            });
          }
          break;

        case "multipleChoice":
          textContent = `${content.question || ""}\n\n`;
          if (content.options && content.options.length > 0) {
            content.options.forEach((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const marker =
                index === content.correctAnswer ? `${letter}) ✓` : `${letter})`;
              textContent += `${marker} ${option}\n`;
            });
          }
          break;

        case "tabs":
          if (Array.isArray(content)) {
            content.forEach((tab) => {
              textContent += `${tab.title}\n${tab.content}\n\n`;
            });
          }
          break;

        case "flipCards":
          if (Array.isArray(content)) {
            content.forEach((card) => {
              textContent += `${card.front}: ${card.back}\n\n`;
            });
          }
          break;

        case "faq":
          textContent = `${content.header || ""}\n\n`;
          if (content.items && content.items.length > 0) {
            content.items.forEach((item) => {
              textContent += `Q: ${item.question}\nA: ${item.answer}\n\n`;
            });
          }
          break;

        case "popups":
          if (Array.isArray(content)) {
            content.forEach((popup) => {
              textContent += `${popup.title}\n${popup.content}\n\n`;
            });
          }
          break;

        default:
          // Fallback for unknown slide types
          textContent = JSON.stringify(content, null, 2);
      }

      // Clean up the text content
      textContent = textContent.trim();

      if (!textContent) {
        StatusManager.showWarning("No text content found to copy");
        return;
      }

      await navigator.clipboard.writeText(textContent);
      StatusManager.showSuccess("Text content copied to clipboard");
    } catch (error) {
      console.error("Failed to copy content:", error);
      StatusManager.showError("Failed to copy content");
    }
  }

  /**
   * Copy slide transcript to clipboard - NEW FEATURE
   */
  async copySlideTranscript(chunkId) {
    const chunk = this.getChunkById(chunkId);
    if (!chunk || !chunk.generatedContent) {
      StatusManager.showWarning("No content available to copy");
      return;
    }

    try {
      let transcript = "";

      // Extract transcript based on slide type
      if (chunk.generatedContent.audioScript) {
        transcript = chunk.generatedContent.audioScript;
      } else {
        // Fallback: create transcript from content
        transcript = this.generateTranscriptFromContent(
          chunk.generatedContent,
          chunk.slideType
        );
      }

      if (!transcript || transcript.trim() === "") {
        StatusManager.showWarning("No transcript available for this slide");
        return;
      }

      await navigator.clipboard.writeText(transcript);
      StatusManager.showSuccess("Transcript copied to clipboard");
    } catch (error) {
      console.error("Failed to copy transcript:", error);
      StatusManager.showError("Failed to copy transcript");
    }
  }

  /**
   * Generate transcript from content when audioScript is not available - NEW HELPER
   */
  generateTranscriptFromContent(content, slideType) {
    let transcript = "";

    switch (slideType) {
      case "title":
      case "textAndImage":
        transcript = `${content.header || ""}\n\n${content.text || ""}`;
        break;

      case "courseInfo":
        transcript = `${content.header || ""}\n\n${content.text || ""}`;
        if (content.objectives) {
          transcript += "\n\nLearning Objectives:\n";
          content.objectives.forEach((obj) => {
            transcript += `- ${obj}\n`;
          });
        }
        break;

      case "textAndBullets":
        transcript = `${content.header || ""}\n\n${content.text || ""}`;
        if (content.bullets) {
          transcript += "\n\nKey Points:\n";
          content.bullets.forEach((bullet) => {
            transcript += `- ${bullet}\n`;
          });
        }
        break;

      case "iconsWithTitles":
        transcript = `${content.header || ""}`;
        if (content.icons) {
          transcript += "\n\n";
          content.icons.forEach((icon) => {
            transcript += `${icon.title}: ${icon.description}\n`;
          });
        }
        break;

      case "multipleChoice":
        transcript = `${content.question || ""}\n\n`;
        if (content.options) {
          content.options.forEach((option, index) => {
            transcript += `${String.fromCharCode(65 + index)}: ${option}\n`;
          });
        }
        break;

      case "tabs":
        if (Array.isArray(content)) {
          content.forEach((tab) => {
            transcript += `${tab.title}\n${tab.content}\n\n`;
          });
        }
        break;

      case "flipCards":
        if (Array.isArray(content)) {
          content.forEach((card) => {
            transcript += `${card.front}: ${card.back}\n`;
          });
        }
        break;

      case "faq":
        transcript = `${content.header || ""}\n\n`;
        if (content.items) {
          content.items.forEach((item) => {
            transcript += `Q: ${item.question}\nA: ${item.answer}\n\n`;
          });
        }
        break;

      case "popups":
        if (Array.isArray(content)) {
          content.forEach((popup) => {
            transcript += `${popup.title}\n${popup.content}\n\n`;
          });
        }
        break;

      default:
        transcript = JSON.stringify(content, null, 2);
    }

    return transcript.trim();
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
   * Setup generation interactions
   */
  setupGenerationInteractions() {
    // FIXED: Don't auto-refresh progress for processing items to prevent flickering
    // The UI will be updated through event handlers instead
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
   * FIXED: Generate all content with proper error handling
   */
  async generateAllContent() {
    console.log("GenerationUIController.generateAllContent called");

    if (!this.contentGenerator) {
      console.error("Content generator not initialized");
      StatusManager.showError("Content generator not initialized");
      return;
    }

    console.log("Calling contentGenerator.generateAllContent...");
    try {
      await this.contentGenerator.generateAllContent();
    } catch (error) {
      console.error("Generate all content failed:", error);
      StatusManager.showError(`Generate all failed: ${error.message}`);
    }
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
   * FIXED: Handle content generated event with proper UI updates
   */
  handleContentGenerated(data) {
    const { chunkId } = data;
    const item = document.querySelector(`[data-chunk-id="${chunkId}"]`);

    if (item) {
      item.classList.remove("processing", "pending");
      item.classList.add("has-content");
      item.dataset.generationStatus = "generated";

      // FIXED: Remove the processing indicator
      const progressElement = item.querySelector(`#progress-${chunkId}`);
      if (progressElement) {
        progressElement.remove();
      }
    }

    // FIXED: Force UI update to reflect the new content
    setTimeout(() => {
      this.updateGenerationUI();
    }, 100);
  }

  /**
   * Handle generation failed event
   */
  handleGenerationFailed(data) {
    const { chunkId, error } = data;
    this.handleGenerationError(chunkId, error);
  }

  /**
   * Handle content reset event
   */
  handleContentReset(data) {
    const { chunkId } = data;
    const item = document.querySelector(`[data-chunk-id="${chunkId}"]`);

    if (item) {
      item.classList.remove("has-content", "processing");
      item.classList.add("pending");
      item.dataset.generationStatus = "pending";
    }

    this.updateGenerationUI();
  }

  /**
   * FIXED: Handle batch completion to clear any remaining loading states
   */
  handleBatchCompleted(data) {
    console.log("Batch generation completed:", data);

    // Remove any remaining processing indicators
    const processingItems = document.querySelectorAll(
      ".generation-item.processing"
    );
    processingItems.forEach((item) => {
      item.classList.remove("processing");
      const progressElement = item.querySelector(".generation-progress");
      if (progressElement) {
        progressElement.remove();
      }
    });

    // Force UI update
    setTimeout(() => {
      this.updateGenerationUI();
    }, 200);
  }

  /**
   * Handle generation error
   */
  handleGenerationError(chunkId, error) {
    const item = document.querySelector(`[data-chunk-id="${chunkId}"]`);
    if (item) {
      item.classList.remove("processing");
      item.classList.add("error");

      // Remove progress indicator
      const progressElement = item.querySelector(`#progress-${chunkId}`);
      if (progressElement) {
        progressElement.remove();
      }

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
   * Save inline edit
   */
  saveInlineEdit(element) {
    const chunkId = element.dataset.chunkId;
    const field = element.dataset.field;

    const sessionKey = `${chunkId}-${field}`;

    if (!chunkId || !field) return;

    const session = this.editingSession.get(sessionKey);
    if (!session) return;

    const newValue = element.textContent || "";
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

    // Set the final value
    current[keys[keys.length - 1]] = value;
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
    this.eventSystem.off("content:generated", this.handleContentGenerated);
    this.eventSystem.off(
      "content:generation-failed",
      this.handleGenerationFailed
    );
    this.eventSystem.off("content:reset", this.handleContentReset);
    this.eventSystem.off("content:batch-generated", this.handleBatchCompleted);

    console.log("GenerationUIController cleaned up");
  }
}

// Make available globally
window.GenerationUIController = GenerationUIController;
