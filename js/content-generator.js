/**
 * Course Forge MVP - Content Generation Manager
 * Handles individual slide content generation and management
 */

class ContentGenerator {
  constructor(stateManager, eventSystem, llmService) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.llmService = llmService;

    this.isProcessing = false;
    this.currentlyGenerating = new Set(); // Track which slides are being generated

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("ContentGenerator initialized");
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    this.eventSystem.on("content:generate", (data) => {
      this.generateSlideContent(data.chunkId);
    });

    this.eventSystem.on("content:regenerate", (data) => {
      this.regenerateSlideContent(data.chunkId);
    });

    this.eventSystem.on("content:update", (data) => {
      this.updateSlideContent(data.chunkId, data.content);
    });

    this.eventSystem.on("content:change-type", (data) => {
      this.changeSlideTypeAndRegenerate(data.chunkId, data.newType);
    });

    this.eventSystem.on("content:generate-all", () => {
      this.generateAllContent();
    });
  }

  /**
   * Generate content for a specific slide
   */
  async generateSlideContent(chunkId) {
    if (this.currentlyGenerating.has(chunkId)) {
      StatusManager.showWarning(
        "Content is already being generated for this slide"
      );
      return;
    }

    try {
      this.currentlyGenerating.add(chunkId);

      const chunk = this.getChunkById(chunkId);
      if (!chunk) {
        throw new Error("Chunk not found");
      }

      const courseConfig = this.stateManager.getState("courseConfig");

      StatusManager.showLoading(`Generating content for "${chunk.title}"...`);

      // Update chunk status to show it's being generated
      this.updateChunkStatus(chunkId, "generating");

      // Generate content using LLM
      const generatedContent = await this.llmService.generateSlideContent(
        chunk,
        courseConfig
      );

      // Save generated content to chunk
      this.saveGeneratedContent(chunkId, generatedContent);

      // Update chunk status
      this.updateChunkStatus(chunkId, "generated");

      StatusManager.showSuccess(`Content generated for "${chunk.title}"`);

      this.eventSystem.emit("content:generated", {
        chunkId,
        content: generatedContent,
        slideType: chunk.slideType,
      });
    } catch (error) {
      console.error("Content generation failed:", error);
      StatusManager.showError(`Failed to generate content: ${error.message}`);

      this.updateChunkStatus(chunkId, "error");

      this.eventSystem.emit("content:generation-failed", {
        chunkId,
        error: error.message,
      });
    } finally {
      this.currentlyGenerating.delete(chunkId);
      StatusManager.hide();
    }
  }

  /**
   * Regenerate content for an existing slide
   */
  async regenerateSlideContent(chunkId) {
    const chunk = this.getChunkById(chunkId);
    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    if (chunk.generatedContent) {
      const confirmed = confirm(
        `Regenerate content for "${chunk.title}"? This will replace the existing content.`
      );
      if (!confirmed) return;
    }

    await this.generateSlideContent(chunkId);
  }

  /**
   * Change slide type and regenerate content
   */
  async changeSlideTypeAndRegenerate(chunkId, newType) {
    try {
      const chunk = this.getChunkById(chunkId);
      if (!chunk) {
        throw new Error("Chunk not found");
      }

      const oldType = chunk.slideType;

      // Update slide type
      this.updateChunkSlideType(chunkId, newType);

      // If there's existing content, ask if they want to regenerate
      if (chunk.generatedContent) {
        const shouldRegenerate = confirm(
          `Slide type changed from ${this.getSlideTypeLabel(
            oldType
          )} to ${this.getSlideTypeLabel(
            newType
          )}. Regenerate content to match the new type?`
        );

        if (shouldRegenerate) {
          await this.generateSlideContent(chunkId);
        } else {
          // Clear the existing content since it doesn't match the new type
          this.clearGeneratedContent(chunkId);
          StatusManager.showInfo(
            "Slide type changed. Generate new content when ready."
          );
        }
      } else {
        StatusManager.showInfo(
          `Slide type changed to ${this.getSlideTypeLabel(newType)}`
        );
      }
    } catch (error) {
      console.error("Slide type change failed:", error);
      StatusManager.showError(`Failed to change slide type: ${error.message}`);
    }
  }

  /**
   * Generate content for all slides that don't have content
   */
  async generateAllContent() {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunksNeedingContent = chunks.filter(
      (chunk) => !chunk.generatedContent && !chunk.isLocked
    );

    if (chunksNeedingContent.length === 0) {
      StatusManager.showInfo("All chunks already have generated content");
      return;
    }

    const confirmed = confirm(
      `Generate content for ${chunksNeedingContent.length} slides? This may take a few minutes.`
    );

    if (!confirmed) return;

    StatusManager.showLoading("Generating content for all slides...");

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunksNeedingContent.length; i++) {
      const chunk = chunksNeedingContent[i];
      const progress = ((i + 1) / chunksNeedingContent.length) * 100;

      StatusManager.showProgress(
        `Generating content for "${chunk.title}"`,
        progress
      );

      try {
        await this.generateSlideContent(chunk.id);
        successCount++;

        // Small delay between generations to avoid rate limiting
        if (i < chunksNeedingContent.length - 1) {
          await this.wait(1000);
        }
      } catch (error) {
        console.error(
          `Failed to generate content for chunk ${chunk.id}:`,
          error
        );
        errorCount++;
      }
    }

    StatusManager.showSuccess(
      `Content generation complete! Success: ${successCount}, Errors: ${errorCount}`
    );
  }

  /**
   * Update slide content manually
   */
  updateSlideContent(chunkId, newContent) {
    try {
      this.saveGeneratedContent(chunkId, newContent);
      this.updateChunkStatus(chunkId, "generated");

      StatusManager.showSuccess("Content updated");

      this.eventSystem.emit("content:updated", {
        chunkId,
        content: newContent,
      });
    } catch (error) {
      console.error("Content update failed:", error);
      StatusManager.showError(`Failed to update content: ${error.message}`);
    }
  }

  /**
   * Get chunk by ID
   */
  getChunkById(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    return chunks.find((chunk) => String(chunk.id) === targetId);
  }

  /**
   * Save generated content to chunk
   */
  saveGeneratedContent(chunkId, content) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      throw new Error("Chunk not found");
    }

    chunks[chunkIndex].generatedContent = content;
    chunks[chunkIndex].lastGenerated = new Date().toISOString();

    this.stateManager.setState("chunks", chunks);
  }

  /**
   * Clear generated content from chunk
   */
  clearGeneratedContent(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      throw new Error("Chunk not found");
    }

    chunks[chunkIndex].generatedContent = null;
    chunks[chunkIndex].lastGenerated = null;

    this.stateManager.setState("chunks", chunks);
  }

  /**
   * Update chunk status
   */
  updateChunkStatus(chunkId, status) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) return;

    chunks[chunkIndex].status = status;
    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:status-updated", { chunkId, status });
  }

  /**
   * Update chunk slide type
   */
  updateChunkSlideType(chunkId, newType) {
    const chunks = this.stateManager.getState("chunks") || [];
    const targetId = String(chunkId);
    const chunkIndex = chunks.findIndex(
      (chunk) => String(chunk.id) === targetId
    );

    if (chunkIndex < 0) {
      throw new Error("Chunk not found");
    }

    const oldType = chunks[chunkIndex].slideType;
    chunks[chunkIndex].slideType = newType;

    this.stateManager.setState("chunks", chunks);

    this.eventSystem.emit("chunk:type-changed", {
      chunkId,
      oldType,
      newType,
    });
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
   * Validate generated content structure
   */
  validateGeneratedContent(content, slideType) {
    // This would contain validation logic for different slide types
    // For now, just check if content exists
    return content && typeof content === "object";
  }

  /**
   * Get content statistics
   */
  getContentStats() {
    const chunks = this.stateManager.getState("chunks") || [];

    return {
      total: chunks.length,
      generated: chunks.filter((chunk) => chunk.generatedContent).length,
      pending: chunks.filter(
        (chunk) => !chunk.generatedContent && !chunk.isLocked
      ).length,
      locked: chunks.filter((chunk) => chunk.isLocked).length,
      generating: this.currentlyGenerating.size,
      byType: this.getContentStatsByType(chunks),
    };
  }

  /**
   * Get content statistics by slide type
   */
  getContentStatsByType(chunks) {
    const stats = {};

    chunks.forEach((chunk) => {
      if (!stats[chunk.slideType]) {
        stats[chunk.slideType] = {
          total: 0,
          generated: 0,
          pending: 0,
        };
      }

      stats[chunk.slideType].total++;

      if (chunk.generatedContent) {
        stats[chunk.slideType].generated++;
      } else {
        stats[chunk.slideType].pending++;
      }
    });

    return stats;
  }

  /**
   * Export generated content
   */
  exportGeneratedContent() {
    const chunks = this.stateManager.getState("chunks") || [];
    const courseConfig = this.stateManager.getState("courseConfig");

    const exportData = {
      course: {
        title: courseConfig.title,
        targetAudience: courseConfig.targetAudience,
        estimatedDuration: courseConfig.estimatedDuration,
        learningObjectives: courseConfig.learningObjectives,
      },
      slides: chunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        slideType: chunk.slideType,
        order: chunk.order,
        estimatedTime: chunk.estimatedTime,
        content: chunk.generatedContent,
        sourceContent: chunk.sourceContent,
        isLocked: chunk.isLocked,
        lastGenerated: chunk.lastGenerated,
      })),
      exportedAt: new Date().toISOString(),
      stats: this.getContentStats(),
    };

    return exportData;
  }

  /**
   * Utility function to wait
   */
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get processing status
   */
  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      currentlyGenerating: Array.from(this.currentlyGenerating),
      canGenerate: this.llmService && this.llmService.isReady,
    };
  }
}

// Export for use in other modules
window.ContentGenerator = ContentGenerator;
