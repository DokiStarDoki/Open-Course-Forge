/**
 * Course Forge MVP - Chunk Management
 * Handles chunk creation, editing, and organization
 */

class ChunkManager {
  constructor(stateManager, eventSystem, llmService) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.llmService = llmService;

    this.isProcessing = false;
    this.draggedChunk = null;

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("ChunkManager initialized");
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for chunk-related events
    this.eventSystem.on("chunk:generate", (data) => {
      this.generateChunks(data.courseConfig);
    });

    this.eventSystem.on("chunk:add", () => {
      this.addNewChunk();
    });

    this.eventSystem.on("chunk:remove", (data) => {
      this.removeChunk(data.chunkId);
    });

    this.eventSystem.on("chunk:lock", (data) => {
      this.toggleChunkLock(data.chunkId);
    });

    this.eventSystem.on("chunk:type-change", (data) => {
      this.changeChunkType(data.chunkId, data.newType);
    });

    this.eventSystem.on("chunk:reorder", (data) => {
      this.reorderChunks(data.oldIndex, data.newIndex);
    });
  }

  /**
   * Generate chunks using AI
   */
  async generateChunks(courseConfig) {
    if (this.isProcessing) {
      StatusManager.showWarning("Chunking is already in progress");
      return;
    }

    try {
      this.isProcessing = true;
      this.stateManager.setProcessingStatus(
        true,
        "Analyzing content and generating chunks..."
      );

      StatusManager.showLoading("Analyzing your content with AI...");

      // Validate course config
      if (!this.validateCourseConfig(courseConfig)) {
        throw new Error("Invalid course configuration");
      }

      // Generate chunks using LLM
      const generatedChunks = await this.llmService.generateChunks(
        courseConfig
      );

      // Get existing chunks and preserve locked ones
      const existingChunks = this.stateManager.getState("chunks") || [];
      const lockedChunks = existingChunks.filter((chunk) => chunk.isLocked);

      // Merge locked chunks with new chunks
      const finalChunks = this.mergeChunks(lockedChunks, generatedChunks);

      // Update state
      this.stateManager.setState("chunks", finalChunks);

      // Emit success event
      this.eventSystem.emit("chunks:generated", {
        count: finalChunks.length,
        newCount: generatedChunks.length,
        lockedCount: lockedChunks.length,
      });

      StatusManager.showSuccess(
        `Successfully generated ${generatedChunks.length} chunks!`
      );

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Chunks generated:", finalChunks);
      }
    } catch (error) {
      console.error("Chunk generation failed:", error);
      StatusManager.showError(`Chunk generation failed: ${error.message}`);

      this.eventSystem.emit("chunks:generation-failed", {
        error: error.message,
      });
    } finally {
      this.isProcessing = false;
      this.stateManager.setProcessingStatus(false);
    }
  }

  /**
   * Validate course configuration
   */
  validateCourseConfig(config) {
    if (!config.title || config.title.trim().length < 3) {
      throw new Error(
        "Course title is required and must be at least 3 characters"
      );
    }

    if (!config.learningObjectives || config.learningObjectives.length === 0) {
      throw new Error("At least one learning objective is required");
    }

    if (!config.sourceContent || config.sourceContent.trim().length < 100) {
      throw new Error("Source content is required and must be substantial");
    }

    const wordCount = config.sourceContent.trim().split(/\s+/).length;
    if (wordCount > CONFIG.CONTENT.MAX_WORD_COUNT) {
      throw new Error(
        `Content is too long (${wordCount} words). Maximum is ${CONFIG.CONTENT.MAX_WORD_COUNT} words.`
      );
    }

    return true;
  }

  /**
   * Merge locked chunks with newly generated chunks
   */
  mergeChunks(lockedChunks, newChunks) {
    const mergedChunks = [];
    let newChunkIndex = 0;

    // If no locked chunks, return all new chunks
    if (lockedChunks.length === 0) {
      return newChunks.map((chunk, index) => ({
        ...chunk,
        order: index,
      }));
    }

    // Create a map of locked chunks by their preferred position
    const lockedChunkMap = new Map();
    lockedChunks.forEach((chunk) => {
      lockedChunkMap.set(chunk.order, chunk);
    });

    // Determine total chunk count
    const totalChunks = Math.max(
      newChunks.length,
      lockedChunks.length + Math.floor(newChunks.length / 2)
    );

    // Merge chunks maintaining locked positions where possible
    for (let i = 0; i < totalChunks; i++) {
      if (lockedChunkMap.has(i)) {
        // Use locked chunk at this position
        const lockedChunk = lockedChunkMap.get(i);
        mergedChunks.push({
          ...lockedChunk,
          order: i,
        });
      } else if (newChunkIndex < newChunks.length) {
        // Use next new chunk
        mergedChunks.push({
          ...newChunks[newChunkIndex],
          order: i,
        });
        newChunkIndex++;
      }
    }

    // Add any remaining new chunks
    while (newChunkIndex < newChunks.length) {
      mergedChunks.push({
        ...newChunks[newChunkIndex],
        order: mergedChunks.length,
      });
      newChunkIndex++;
    }

    return mergedChunks;
  }

  /**
   * Add a new chunk manually
   */
  addNewChunk() {
    const chunks = this.stateManager.getState("chunks") || [];
    const newChunk = {
      id: `chunk_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate string ID
      title: `New Chunk ${chunks.length + 1}`,
      slideType: "textAndImage",
      sourceContent: "Manually created chunk - add your content here",
      estimatedTime: "2 minutes",
      order: chunks.length,
      isLocked: false,
      generatedContent: null,
    };

    chunks.push(newChunk);
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:added", { chunk: newChunk });
    StatusManager.showSuccess("New chunk added");
  }

  /**
   * Remove a chunk
   */
  removeChunk(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];

    // Convert chunkId to string to handle both string and number IDs
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      console.error("Chunk not found:", {
        chunkId,
        targetId,
        availableIds: chunks.map((c) => c.id),
      });
      StatusManager.showError("Chunk not found");
      return;
    }

    const chunk = chunks[chunkIndex];

    // Confirm deletion if chunk has content
    if (chunk.generatedContent || chunk.isLocked) {
      const confirmMessage = chunk.isLocked
        ? "This chunk is locked. Are you sure you want to delete it?"
        : "This chunk has generated content. Are you sure you want to delete it?";

      if (!confirm(confirmMessage)) {
        return;
      }
    }

    // Remove chunk
    chunks.splice(chunkIndex, 1);

    // Reorder remaining chunks
    chunks.forEach((chunk, index) => {
      chunk.order = index;
    });

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:removed", { chunkId, removedChunk: chunk });
    StatusManager.showSuccess("Chunk removed");
  }

  /**
   * Toggle chunk lock status
   */
  toggleChunkLock(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];

    // Convert chunkId to string to handle both string and number IDs
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      console.error("Chunk not found:", {
        chunkId,
        targetId,
        availableIds: chunks.map((c) => c.id),
      });
      StatusManager.showError("Chunk not found");
      return;
    }

    chunks[chunkIndex].isLocked = !chunks[chunkIndex].isLocked;
    this.stateManager.setState("chunks", chunks);

    const status = chunks[chunkIndex].isLocked ? "locked" : "unlocked";
    this.eventSystem.emit("chunk:lock-toggled", {
      chunkId,
      isLocked: chunks[chunkIndex].isLocked,
    });

    StatusManager.showInfo(`Chunk ${status}`);
  }

  /**
   * Change chunk type
   */
  changeChunkType(chunkId, newType) {
    const chunks = this.stateManager.getState("chunks") || [];

    // Convert chunkId to string to handle both string and number IDs
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      console.error("Chunk not found:", {
        chunkId,
        targetId,
        availableIds: chunks.map((c) => c.id),
      });
      StatusManager.showError("Chunk not found");
      return;
    }

    const oldType = chunks[chunkIndex].slideType;
    chunks[chunkIndex].slideType = newType;

    // Clear generated content if type changed
    if (oldType !== newType) {
      chunks[chunkIndex].generatedContent = null;
    }

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:type-changed", {
      chunkId,
      oldType,
      newType,
    });

    StatusManager.showInfo(
      `Chunk type changed to ${this.getSlideTypeLabel(newType)}`
    );
  }

  /**
   * Update chunk title
   */
  updateChunkTitle(chunkId, newTitle) {
    const chunks = this.stateManager.getState("chunks") || [];

    // Convert chunkId to string to handle both string and number IDs
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      console.error("Chunk not found for title update:", {
        chunkId,
        targetId,
        availableIds: chunks.map((c) => c.id),
      });
      return;
    }

    chunks[chunkIndex].title = newTitle;
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:title-updated", { chunkId, newTitle });
  }

  /**
   * Reorder chunks
   */
  reorderChunks(oldIndex, newIndex) {
    const chunks = this.stateManager.getState("chunks") || [];

    if (
      oldIndex < 0 ||
      oldIndex >= chunks.length ||
      newIndex < 0 ||
      newIndex >= chunks.length
    ) {
      return;
    }

    // Move chunk from old position to new position
    const movedChunk = chunks.splice(oldIndex, 1)[0];
    chunks.splice(newIndex, 0, movedChunk);

    // Update order values
    chunks.forEach((chunk, index) => {
      chunk.order = index;
    });

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunks:reordered", { oldIndex, newIndex });
    StatusManager.showInfo("Chunks reordered");
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
   * Setup drag and drop for chunk reordering
   */
  setupDragAndDrop(container) {
    if (!container) return;

    container.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("chunk-item")) {
        this.draggedChunk = e.target;
        e.target.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      }
    });

    container.addEventListener("dragend", (e) => {
      if (e.target.classList.contains("chunk-item")) {
        e.target.classList.remove("dragging");
        this.draggedChunk = null;
      }
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggedOver = e.target.closest(".chunk-item");
      if (draggedOver && draggedOver !== this.draggedChunk) {
        draggedOver.classList.add("drag-over");
      }
    });

    container.addEventListener("dragleave", (e) => {
      const draggedOver = e.target.closest(".chunk-item");
      if (draggedOver) {
        draggedOver.classList.remove("drag-over");
      }
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      const draggedOver = e.target.closest(".chunk-item");

      if (draggedOver && draggedOver !== this.draggedChunk) {
        const chunks = Array.from(container.querySelectorAll(".chunk-item"));
        const oldIndex = chunks.indexOf(this.draggedChunk);
        const newIndex = chunks.indexOf(draggedOver);

        this.reorderChunks(oldIndex, newIndex);
      }

      // Clean up drag classes
      container.querySelectorAll(".chunk-item").forEach((item) => {
        item.classList.remove("drag-over");
      });
    });
  }

  /**
   * Get chunk statistics
   */
  getChunkStats() {
    const chunks = this.stateManager.getState("chunks") || [];

    const stats = {
      total: chunks.length,
      locked: chunks.filter((chunk) => chunk.isLocked).length,
      generated: chunks.filter((chunk) => chunk.generatedContent).length,
      byType: {},
    };

    // Count by slide type
    chunks.forEach((chunk) => {
      stats.byType[chunk.slideType] = (stats.byType[chunk.slideType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export chunks for debugging
   */
  exportChunks() {
    const chunks = this.stateManager.getState("chunks") || [];
    const exportData = {
      timestamp: new Date().toISOString(),
      chunks: chunks,
      stats: this.getChunkStats(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `chunks-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    StatusManager.showSuccess("Chunks exported");
  }

  /**
   * Import chunks from file
   */
  async importChunks(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.chunks || !Array.isArray(importData.chunks)) {
        throw new Error("Invalid chunks file format");
      }

      // Validate chunks
      const validChunks = importData.chunks.filter(
        (chunk) => chunk.id && chunk.title && chunk.slideType
      );

      if (validChunks.length === 0) {
        throw new Error("No valid chunks found in file");
      }

      // Confirm import
      const confirmed = confirm(
        `Import ${validChunks.length} chunks? This will replace your current chunks.`
      );

      if (!confirmed) return;

      // Update state
      this.stateManager.setState("chunks", validChunks);

      StatusManager.showSuccess(`Imported ${validChunks.length} chunks`);
    } catch (error) {
      console.error("Chunk import failed:", error);
      StatusManager.showError(`Import failed: ${error.message}`);
    }
  }

  /**
   * Validate chunk data
   */
  validateChunk(chunk) {
    const errors = [];

    if (!chunk.title || chunk.title.trim().length < 3) {
      errors.push("Title must be at least 3 characters");
    }

    if (
      !chunk.slideType ||
      !CONFIG.SLIDE_TYPES.some((type) => type.value === chunk.slideType)
    ) {
      errors.push("Invalid slide type");
    }

    if (typeof chunk.order !== "number") {
      errors.push("Order must be a number");
    }

    return errors;
  }

  /**
   * Get processing status
   */
  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      canGenerate: !this.isProcessing && this.llmService.isReady,
    };
  }
}

// Export for use in other modules
window.ChunkManager = ChunkManager;
