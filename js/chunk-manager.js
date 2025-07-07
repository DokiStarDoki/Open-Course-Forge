/**
 * Chunk Manager - Handles chunk operations and state management (FIXED GROUND TRUTH)
 * Enhanced with proper LLM service integration and error handling
 * FIXED: Ground truth is always preserved during all operations
 */
class ChunkManager {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.isProcessing = false;
    this.llmService = null; // Will be set by app initialization

    // Subscribe to events
    this.eventSystem.on("chunks:generate", this.generateChunks.bind(this));
    this.eventSystem.on("chunks:regenerate", this.regenerateChunks.bind(this));
  }

  /**
   * ADDED: Set LLM service reference (called by app)
   */
  setLLMService(llmService) {
    this.llmService = llmService;
    console.log("✅ LLM service set in ChunkManager");
  }

  /**
   * ENHANCED: Generate chunks from course content with better error handling
   * FIXED: Preserve existing ground truth when regenerating
   */
  async generateChunks(courseConfig, force = false) {
    if (this.isProcessing && !force) {
      StatusManager.showWarning("Chunk generation already in progress");
      return;
    }

    try {
      this.isProcessing = true;
      this.stateManager.setProcessingStatus(
        true,
        "Generating content chunks..."
      );

      // Validate LLM service availability
      if (!this.llmService) {
        throw new Error(
          "AI service not available. Please check your configuration."
        );
      }

      // Ensure LLM service is ready
      await this.llmService.ensureReady();

      // Get course configuration
      if (!courseConfig) {
        courseConfig = this.stateManager.getState("courseConfig");
      }

      if (!courseConfig) {
        throw new Error("Course configuration not found");
      }

      // Validate configuration
      this.validateCourseConfig(courseConfig);

      // Get existing chunks and identify locked ones
      const existingChunks = this.stateManager.getState("chunks") || [];
      const lockedChunks = existingChunks.filter((chunk) => chunk.isLocked);

      // FIXED: Preserve ground truth from existing chunks (even unlocked ones)
      const preservedGroundTruths = new Map();
      existingChunks.forEach((chunk) => {
        if (chunk.groundTruth && chunk.groundTruth.trim()) {
          preservedGroundTruths.set(chunk.title, {
            groundTruth: chunk.groundTruth,
            chunkId: chunk.id,
            order: chunk.order,
          });
          console.log(
            `🛡️ Preserving ground truth for "${chunk.title}":`,
            chunk.groundTruth.substring(0, 100) + "..."
          );
        }
      });

      StatusManager.showLoading("Analyzing content and generating chunks...");

      // Generate chunks using LLM
      const generatedChunks = await this.llmService.generateChunks(
        courseConfig
      );

      if (!generatedChunks || generatedChunks.length === 0) {
        throw new Error("No chunks were generated");
      }

      // FIXED: Restore preserved ground truths where possible
      generatedChunks.forEach((chunk) => {
        const preserved = preservedGroundTruths.get(chunk.title);
        if (preserved) {
          console.log(`🔄 Restoring ground truth for "${chunk.title}"`);
          chunk.groundTruth = preserved.groundTruth;
        }
      });

      // Merge with locked chunks
      const finalChunks = this.mergeChunks(lockedChunks, generatedChunks);

      // Update state
      this.stateManager.setState("chunks", finalChunks);

      // Emit success event
      this.eventSystem.emit("chunks:generated", {
        chunks: finalChunks,
        count: finalChunks.length,
        generatedCount: generatedChunks.length,
        lockedCount: lockedChunks.length,
        preservedGroundTruths: preservedGroundTruths.size,
      });

      StatusManager.showSuccess(
        `Successfully generated ${generatedChunks.length} chunks!${
          lockedChunks.length > 0
            ? ` (${lockedChunks.length} locked chunks preserved)`
            : ""
        }${
          preservedGroundTruths.size > 0
            ? ` (${preservedGroundTruths.size} ground truths preserved)`
            : ""
        }`
      );

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Chunks generated:", finalChunks);
      }

      return finalChunks;
    } catch (error) {
      console.error("Chunk generation failed:", error);
      StatusManager.showError(`Chunk generation failed: ${error.message}`);

      this.eventSystem.emit("chunks:generation-failed", {
        error: error.message,
      });

      throw error; // Re-throw for caller handling
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

    const courseConfig = this.stateManager.getState("courseConfig");
    await this.generateChunks(courseConfig, true);
  }

  /**
   * ENHANCED: Validate course configuration with detailed feedback
   */
  validateCourseConfig(config) {
    const errors = [];
    const warnings = [];

    if (!config.title || config.title.trim().length < 3) {
      errors.push("Course title is required and must be at least 3 characters");
    }

    if (!config.learningObjectives || config.learningObjectives.length === 0) {
      errors.push("At least one learning objective is required");
    }

    if (!config.sourceContent || config.sourceContent.trim().length < 100) {
      errors.push("Source content is required and must be substantial");
    }

    const wordCount = config.sourceContent
      ? config.sourceContent.trim().split(/\s+/).length
      : 0;
    if (wordCount > CONFIG.CONTENT.MAX_WORD_COUNT) {
      errors.push(
        `Content is too long (${wordCount} words). Maximum is ${CONFIG.CONTENT.MAX_WORD_COUNT} words.`
      );
    }

    if (wordCount < CONFIG.CONTENT.MIN_WORD_COUNT) {
      warnings.push(
        `Content is quite short (${wordCount} words). Consider adding more detail for better chunking.`
      );
    }

    // Show warnings if any
    if (warnings.length > 0 && CONFIG.DEBUG.ENABLED) {
      console.warn("Course config warnings:", warnings);
    }

    // Throw error if validation fails
    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }

    return true;
  }

  /**
   * ENHANCED: Merge locked chunks with newly generated chunks
   * FIXED: Better preservation of ground truth and content
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

    console.log(
      `🔄 Merged chunks: ${lockedChunks.length} locked + ${newChunks.length} new = ${mergedChunks.length} total`
    );
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
      createdAt: new Date().toISOString(),
    };

    chunks.push(newChunk);
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:added", { chunk: newChunk });
    StatusManager.showSuccess("New chunk added");

    return newChunk;
  }

  /**
   * ENHANCED: Remove a chunk with better error handling
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
      return false;
    }

    const chunk = chunks[chunkIndex];

    // Confirm deletion if chunk has content
    if (chunk.generatedContent || chunk.isLocked) {
      const confirmMessage = chunk.isLocked
        ? "This chunk is locked. Are you sure you want to delete it?"
        : "This chunk has generated content. Are you sure you want to delete it?";

      if (!confirm(confirmMessage)) {
        return false;
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
    return true;
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
      return null;
    }

    // Create duplicate
    const duplicatedChunk = {
      ...originalChunk,
      id: `chunk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: `${originalChunk.title} (Copy)`,
      order: chunks.length,
      isLocked: false, // Duplicated chunks are not locked by default
      generatedContent: null, // Don't copy generated content
      createdAt: new Date().toISOString(),
      // FIXED: Preserve ground truth when duplicating
      groundTruth: originalChunk.groundTruth || "",
    };

    chunks.push(duplicatedChunk);
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:duplicated", {
      originalId: targetId,
      duplicatedChunk,
    });

    StatusManager.showSuccess("Chunk duplicated");
    return duplicatedChunk;
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
      return false;
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

    return true;
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
      return false;
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

    return true;
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
      return false;
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

    return true;
  }

  /**
   * FIXED: Change chunk slide type - preserve ground truth
   */
  changeChunkType(chunkId, newType) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunk = chunks.find((chunk) => String(chunk.id) === targetId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return false;
    }

    if (chunk.isLocked) {
      StatusManager.showWarning("Cannot change type of locked chunk");
      return false;
    }

    const oldType = chunk.slideType;

    // FIXED: Preserve ground truth when changing slide type
    const preservedGroundTruth = chunk.groundTruth;

    chunk.slideType = newType;

    // Clear generated content when changing type
    if (chunk.generatedContent) {
      chunk.generatedContent = null;
      StatusManager.showInfo(
        "Generated content cleared due to slide type change"
      );
    }

    // FIXED: Restore preserved ground truth
    chunk.groundTruth = preservedGroundTruth;

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:type-changed", {
      chunkId: targetId,
      oldType,
      newType,
    });

    return true;
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
      return false;
    }

    chunk.title = newTitle.trim();
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:title-updated", {
      chunkId: targetId,
      title: newTitle,
    });

    return true;
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
      return false;
    }

    chunk.sourceContent = newContent.trim();
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:source-updated", {
      chunkId: targetId,
      sourceContent: newContent,
    });

    return true;
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
      return false;
    }

    // FIXED: Update ground truth and log the change
    const oldGroundTruth = chunk.groundTruth;
    chunk.groundTruth = newGroundTruth.trim();

    console.log("🎯 Ground truth updated:", {
      chunkId: targetId,
      chunkTitle: chunk.title,
      oldLength: oldGroundTruth ? oldGroundTruth.length : 0,
      newLength: chunk.groundTruth.length,
      updated: true,
    });

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:ground-truth-updated", {
      chunkId: targetId,
      groundTruth: newGroundTruth,
    });

    return true;
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
   * ENHANCED: Get chunks summary with more detailed stats
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
      slideTypes: {},
      estimatedTotalTime: 0,
    };

    // Calculate slide type distribution
    chunks.forEach((chunk) => {
      summary.slideTypes[chunk.slideType] =
        (summary.slideTypes[chunk.slideType] || 0) + 1;

      // Calculate estimated time (convert "X minutes" to number)
      const timeMatch = chunk.estimatedTime?.match(/(\d+)/);
      if (timeMatch) {
        summary.estimatedTotalTime += parseInt(timeMatch[1]);
      }
    });

    return summary;
  }

  /**
   * ADDED: Get processing status
   */
  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      hasLLMService: !!this.llmService,
      llmServiceReady: this.llmService ? this.llmService.isReady : false,
    };
  }

  /**
   * ADDED: Bulk operations for chunks
   */
  bulkUpdateChunks(updates) {
    const chunks = this.stateManager.getState("chunks") || [];
    let updatedCount = 0;

    updates.forEach(({ chunkId, updates: chunkUpdates }) => {
      const targetId = String(chunkId);
      const chunkIndex = chunks.findIndex(
        (chunk) => String(chunk.id) === targetId
      );

      if (chunkIndex >= 0) {
        Object.assign(chunks[chunkIndex], chunkUpdates);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      this.stateManager.setState("chunks", chunks);
      StatusManager.showSuccess(`Updated ${updatedCount} chunks`);
    }

    return updatedCount;
  }

  /**
   * ADDED: Export chunks for backup/transfer
   */
  exportChunks() {
    const chunks = this.getAllChunks();
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      chunks: chunks,
      summary: this.getChunksSummary(),
    };

    return exportData;
  }

  /**
   * ADDED: Import chunks from backup
   */
  importChunks(importData, options = { merge: false, preserveLocked: true }) {
    if (!importData.chunks || !Array.isArray(importData.chunks)) {
      throw new Error("Invalid import data: missing chunks array");
    }

    const existingChunks = this.stateManager.getState("chunks") || [];
    let finalChunks;

    if (options.merge) {
      // Merge with existing chunks
      const lockedChunks = options.preserveLocked
        ? existingChunks.filter((chunk) => chunk.isLocked)
        : [];

      finalChunks = this.mergeChunks(lockedChunks, importData.chunks);
    } else {
      // Replace all chunks
      finalChunks = importData.chunks.map((chunk, index) => ({
        ...chunk,
        order: index,
      }));
    }

    this.stateManager.setState("chunks", finalChunks);

    this.eventSystem.emit("chunks:imported", {
      importedCount: importData.chunks.length,
      totalCount: finalChunks.length,
      merged: options.merge,
    });

    StatusManager.showSuccess(
      `Imported ${importData.chunks.length} chunks ${
        options.merge ? "(merged)" : "(replaced)"
      }`
    );

    return finalChunks;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.eventSystem.off("chunks:generate", this.generateChunks);
    this.eventSystem.off("chunks:regenerate", this.regenerateChunks);
    this.isProcessing = false;
    this.llmService = null;

    console.log("ChunkManager cleaned up");
  }
}

// Export for use in other modules
window.ChunkManager = ChunkManager;
