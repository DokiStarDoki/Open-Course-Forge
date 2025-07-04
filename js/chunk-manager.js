/**
 * Chunk Manager - Handles chunk operations and state management
 */
class ChunkManager {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.isProcessing = false;

    // Initialize LLM service
    this.llmService = new LLMService();

    // Subscribe to events
    this.eventSystem.on("chunks:generate", this.generateChunks.bind(this));
    this.eventSystem.on("chunks:regenerate", this.regenerateChunks.bind(this));
  }

  /**
   * Generate chunks from course content
   */
  async generateChunks(force = false) {
    if (this.isProcessing && !force) {
      StatusManager.showWarning("Chunk generation already in progress");
      return;
    }

    try {
      this.isProcessing = true;
      this.stateManager.setProcessingStatus(true);

      // Get course configuration
      const courseConfig = this.stateManager.getState("courseConfig");
      if (!courseConfig) {
        throw new Error("Course configuration not found");
      }

      // Validate configuration
      this.validateCourseConfig(courseConfig);

      // Get existing chunks and identify locked ones
      const existingChunks = this.stateManager.getState("chunks") || [];
      const lockedChunks = existingChunks.filter((chunk) => chunk.isLocked);

      StatusManager.showInfo("Generating course chunks...");

      // Generate chunks using LLM
      const generatedChunks = await this.llmService.generateChunks(
        courseConfig
      );

      if (!generatedChunks || generatedChunks.length === 0) {
        throw new Error("No chunks were generated");
      }

      // Merge with locked chunks
      const finalChunks = this.mergeChunks(lockedChunks, generatedChunks);

      // Update state
      this.stateManager.setState("chunks", finalChunks);

      // Emit success event
      this.eventSystem.emit("chunks:generated", {
        chunks: finalChunks,
        count: finalChunks.length,
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
   * Regenerate all chunks
   */
  async regenerateChunks() {
    const existingChunks = this.stateManager.getState("chunks") || [];
    const hasContent = existingChunks.some(
      (chunk) => chunk.generatedContent || chunk.isLocked
    );

    if (hasContent) {
      const confirmed = confirm(
        "This will regenerate all chunks and may lose existing content. Locked chunks will be preserved. Continue?"
      );
      if (!confirmed) return;
    }

    await this.generateChunks(true);
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
   * Add a new chunk manually - FIXED TO INCLUDE GROUND TRUTH
   */
  addNewChunk() {
    const chunks = this.stateManager.getState("chunks") || [];
    const newChunk = {
      id: `chunk_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate string ID
      title: `New Chunk ${chunks.length + 1}`,
      slideType: "textAndImage",
      sourceContent: "Manually created chunk - add your content here",
      groundTruth: "", // FIXED: Added ground truth field
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

    // Remove the chunk
    chunks.splice(chunkIndex, 1);

    // Update order for remaining chunks
    chunks.forEach((chunk, index) => {
      chunk.order = index;
    });

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:removed", {
      chunkId: targetId,
      remainingCount: chunks.length,
    });

    StatusManager.showSuccess("Chunk removed");
  }

  /**
   * Duplicate a chunk
   */
  duplicateChunk(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const originalChunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!originalChunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    // Create duplicate
    const duplicatedChunk = {
      ...originalChunk,
      id: `chunk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: `${originalChunk.title} (Copy)`,
      order: chunks.length,
      isLocked: false, // Duplicated chunks are not locked by default
      generatedContent: null, // Don't copy generated content
    };

    chunks.push(duplicatedChunk);
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:duplicated", {
      originalId: targetId,
      duplicatedChunk,
    });

    StatusManager.showSuccess("Chunk duplicated");
  }

  /**
   * Move chunk up in order
   */
  moveChunkUp(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const currentIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (currentIndex <= 0) {
      StatusManager.showWarning("Chunk is already at the top");
      return;
    }

    // Swap with previous chunk
    [chunks[currentIndex], chunks[currentIndex - 1]] = [
      chunks[currentIndex - 1],
      chunks[currentIndex],
    ];

    // Update order values
    chunks.forEach((chunk, index) => {
      chunk.order = index;
    });

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:moved", {
      chunkId: targetId,
      direction: "up",
    });
  }

  /**
   * Move chunk down in order
   */
  moveChunkDown(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const currentIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (currentIndex < 0 || currentIndex >= chunks.length - 1) {
      StatusManager.showWarning("Chunk is already at the bottom");
      return;
    }

    // Swap with next chunk
    [chunks[currentIndex], chunks[currentIndex + 1]] = [
      chunks[currentIndex + 1],
      chunks[currentIndex],
    ];

    // Update order values
    chunks.forEach((chunk, index) => {
      chunk.order = index;
    });

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:moved", {
      chunkId: targetId,
      direction: "down",
    });
  }

  /**
   * Toggle chunk lock status
   */
  toggleChunkLock(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    chunk.isLocked = !chunk.isLocked;
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:lock-toggled", {
      chunkId: targetId,
      isLocked: chunk.isLocked,
    });

    StatusManager.showSuccess(
      chunk.isLocked ? "Chunk locked" : "Chunk unlocked"
    );
  }

  /**
   * Change chunk slide type
   */
  changeChunkType(chunkId, newType) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    if (chunk.isLocked) {
      StatusManager.showWarning("Cannot change type of locked chunk");
      return;
    }

    const oldType = chunk.slideType;
    chunk.slideType = newType;

    // Clear generated content when changing type
    if (chunk.generatedContent) {
      chunk.generatedContent = null;
      StatusManager.showInfo(
        "Generated content cleared due to slide type change"
      );
    }

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:type-changed", {
      chunkId: targetId,
      oldType,
      newType,
    });
  }

  /**
   * Update chunk title
   */
  updateChunkTitle(chunkId, newTitle) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    chunk.title = newTitle.trim();
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:title-updated", {
      chunkId: targetId,
      title: newTitle,
    });
  }

  /**
   * Update chunk source content
   */
  updateChunkSourceContent(chunkId, newContent) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    chunk.sourceContent = newContent.trim();
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:source-updated", {
      chunkId: targetId,
      sourceContent: newContent,
    });
  }

  /**
   * Update chunk ground truth
   */
  updateChunkGroundTruth(chunkId, newGroundTruth) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    chunk.groundTruth = newGroundTruth.trim();
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:ground-truth-updated", {
      chunkId: targetId,
      groundTruth: newGroundTruth,
    });
  }

  /**
   * Get chunk by ID
   */
  getChunk(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    return chunks.find((chunk) => String(chunk.id) === targetId);
  }

  /**
   * Get all chunks
   */
  getAllChunks() {
    return this.stateManager.getState("chunks") || [];
  }

  /**
   * Get chunks summary
   */
  getChunksSummary() {
    const chunks = this.getAllChunks();
    const summary = {
      total: chunks.length,
      locked: chunks.filter((c) => c.isLocked).length,
      generated: chunks.filter((c) => c.generatedContent).length,
      withGroundTruth: chunks.filter(
        (c) => c.groundTruth && c.groundTruth.trim()
      ).length,
    };

    return summary;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.eventSystem.off("chunks:generate", this.generateChunks);
    this.eventSystem.off("chunks:regenerate", this.regenerateChunks);
    this.isProcessing = false;
  }
}

// Export for use in other modules
window.ChunkManager = ChunkManager;
