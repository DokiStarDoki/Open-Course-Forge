/**
 * Course Forge MVP - Content Generator
 * Handles content generation for slides using LLM service
 */

class ContentGenerator {
  constructor(stateManager, eventSystem, llmService) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.llmService = llmService;

    // Track currently generating slides to prevent duplicates
    this.currentlyGenerating = new Set();
    this.batchOperationId = null;

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

      const chunks = this.stateManager.getState("chunks") || [];
      const chunk = chunks.find((c) => c.id === chunkId);

      if (!chunk) {
        throw new Error("Chunk not found");
      }

      if (chunk.isLocked) {
        throw new Error("Cannot generate content for locked chunk");
      }

      StatusManager.showLoading(`Generating content for "${chunk.title}"...`);

      const courseConfig = this.stateManager.getState("courseConfig");
      const generatedContent = await this.llmService.generateSlideContent(
        chunk,
        courseConfig
      );

      // Update chunk with generated content
      const chunkIndex = chunks.findIndex((c) => c.id === chunkId);
      if (chunkIndex >= 0) {
        chunks[chunkIndex].generatedContent = generatedContent;
        chunks[chunkIndex].lastGenerated = new Date().toISOString();
        this.stateManager.setState("chunks", chunks);
      }

      StatusManager.showSuccess(`Content generated for "${chunk.title}"`);

      this.eventSystem.emit("content:generated", {
        chunkId,
        slideType: chunk.slideType,
        content: generatedContent,
      });
    } catch (error) {
      console.error(`Content generation failed for ${chunkId}:`, error);
      StatusManager.showError(`Generation failed: ${error.message}`);

      this.eventSystem.emit("content:generation-failed", {
        chunkId,
        error: error.message,
      });
    } finally {
      this.currentlyGenerating.delete(chunkId);
    }
  }

  /**
   * Regenerate content for a specific slide
   */
  async regenerateSlideContent(chunkId) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunk = chunks.find((c) => c.id === chunkId);

    if (!chunk) {
      StatusManager.showError("Chunk not found");
      return;
    }

    if (chunk.isLocked) {
      StatusManager.showWarning("Cannot regenerate content for locked chunk");
      return;
    }

    const confirmed = confirm(
      `Regenerate content for "${chunk.title}"? This will replace the existing content.`
    );
    if (!confirmed) return;

    // Clear existing content and regenerate
    const chunkIndex = chunks.findIndex((c) => c.id === chunkId);
    if (chunkIndex >= 0) {
      chunks[chunkIndex].generatedContent = null;
      this.stateManager.setState("chunks", chunks);
    }

    await this.generateSlideContent(chunkId);
  }

  /**
   * Generate content for all slides
   */
  async generateAllContent() {
    const chunks = this.stateManager.getState("chunks") || [];
    const pendingChunks = chunks.filter(
      (chunk) => !chunk.generatedContent && !chunk.isLocked
    );

    if (pendingChunks.length === 0) {
      StatusManager.showInfo("All slides already have content or are locked");
      return;
    }

    const confirmed = confirm(
      `Generate content for ${pendingChunks.length} slides? This may take several minutes.`
    );
    if (!confirmed) return;

    // Start batch operation
    this.batchOperationId = `batch-${Date.now()}`;
    StatusManager.startBatchOperation(
      this.batchOperationId,
      `Generating content for ${pendingChunks.length} slides...`
    );

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < pendingChunks.length; i++) {
      const chunk = pendingChunks[i];

      try {
        // Show progress
        StatusManager.addBatchMessage(
          this.batchOperationId,
          `Generating "${chunk.title}" (${i + 1}/${pendingChunks.length})`,
          `progress-${i}`
        );

        await this.generateSlideContent(chunk.id);
        successCount++;

        // Add delay between generations to avoid rate limiting
        if (i < pendingChunks.length - 1) {
          await this.delay(1000);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          chunkTitle: chunk.title,
          error: error.message,
        });
        console.error(`Failed to generate content for ${chunk.title}:`, error);
      }
    }

    // Complete batch operation
    const completionMessage = `Content generation complete! ${successCount} successful${
      errorCount > 0 ? `, ${errorCount} failed` : ""
    }`;
    const completionType = errorCount > 0 ? "warning" : "success";

    StatusManager.completeBatchOperation(
      this.batchOperationId,
      completionMessage,
      completionType
    );

    // Log detailed errors if any
    if (errors.length > 0) {
      console.warn("Content generation errors:", errors);
    }

    this.eventSystem.emit("content:batch-generated", {
      total: pendingChunks.length,
      successful: successCount,
      failed: errorCount,
      errors: errors,
    });
  }

  /**
   * Change slide type and regenerate content
   */
  async changeSlideTypeAndRegenerate(chunkId, newSlideType) {
    const chunks = this.stateManager.getState("chunks") || [];
    const chunkIndex = chunks.findIndex((c) => c.id === chunkId);

    if (chunkIndex < 0) {
      StatusManager.showError("Chunk not found");
      return;
    }

    const chunk = chunks[chunkIndex];
    if (chunk.isLocked) {
      StatusManager.showWarning("Cannot change slide type for locked chunk");
      return;
    }

    const oldType = chunk.slideType;

    try {
      StatusManager.showLoading(`Changing slide type to ${newSlideType}...`);

      // Update slide type and clear content
      chunks[chunkIndex].slideType = newSlideType;
      chunks[chunkIndex].generatedContent = null;
      this.stateManager.setState("chunks", chunks);

      // Regenerate content with new type
      await this.generateSlideContent(chunkId);

      this.eventSystem.emit("content:type-changed", {
        chunkId,
        oldType,
        newType: newSlideType,
      });
    } catch (error) {
      console.error("Failed to change slide type:", error);
      StatusManager.showError(`Failed to change slide type: ${error.message}`);

      // Revert slide type on error
      chunks[chunkIndex].slideType = oldType;
      this.stateManager.setState("chunks", chunks);
    }
  }

  /**
   * Export generated content
   */
  exportGeneratedContent() {
    const chunks = this.stateManager.getState("chunks") || [];
    const courseConfig = this.stateManager.getState("courseConfig");

    const generatedChunks = chunks.filter((chunk) => chunk.generatedContent);

    if (generatedChunks.length === 0) {
      StatusManager.showWarning("No generated content to export");
      return null;
    }

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      course: {
        title: courseConfig.title,
        targetAudience: courseConfig.targetAudience,
        estimatedDuration: courseConfig.estimatedDuration,
        learningObjectives: courseConfig.learningObjectives,
      },
      slides: generatedChunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        slideType: chunk.slideType,
        order: chunk.order,
        content: chunk.generatedContent,
        estimatedTime: chunk.estimatedTime,
        isLocked: chunk.isLocked,
        lastGenerated: chunk.lastGenerated,
      })),
      stats: {
        totalSlides: generatedChunks.length,
        generatedSlides: generatedChunks.length,
        slideTypes: this.getSlideTypeStats(generatedChunks),
      },
    };
  }

  /**
   * Get slide type statistics
   */
  getSlideTypeStats(chunks) {
    const stats = {};
    chunks.forEach((chunk) => {
      stats[chunk.slideType] = (stats[chunk.slideType] || 0) + 1;
    });
    return stats;
  }

  /**
   * Get generation statistics
   */
  getGenerationStats() {
    const chunks = this.stateManager.getState("chunks") || [];

    return {
      total: chunks.length,
      generated: chunks.filter((chunk) => chunk.generatedContent).length,
      pending: chunks.filter(
        (chunk) => !chunk.generatedContent && !chunk.isLocked
      ).length,
      locked: chunks.filter((chunk) => chunk.isLocked).length,
      currentlyGenerating: this.currentlyGenerating.size,
      slideTypes: this.getSlideTypeStats(
        chunks.filter((chunk) => chunk.generatedContent)
      ),
    };
  }

  /**
   * Validate content before generation
   */
  validateForGeneration() {
    const courseConfig = this.stateManager.getState("courseConfig");
    const chunks = this.stateManager.getState("chunks") || [];

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!courseConfig.title) {
      validation.errors.push("Course title is required");
      validation.isValid = false;
    }

    if (
      !courseConfig.learningObjectives ||
      courseConfig.learningObjectives.length === 0
    ) {
      validation.errors.push("Learning objectives are required");
      validation.isValid = false;
    }

    if (!courseConfig.sourceContent) {
      validation.errors.push("Source content is required");
      validation.isValid = false;
    }

    if (chunks.length === 0) {
      validation.errors.push("No chunks available for generation");
      validation.isValid = false;
    }

    if (!this.llmService || !this.llmService.isReady) {
      validation.errors.push("AI service is not ready");
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Cancel all ongoing generation
   */
  cancelAllGeneration() {
    if (this.currentlyGenerating.size > 0) {
      const cancelled = Array.from(this.currentlyGenerating);
      this.currentlyGenerating.clear();

      if (this.batchOperationId) {
        StatusManager.completeBatchOperation(
          this.batchOperationId,
          "Content generation cancelled",
          "warning"
        );
        this.batchOperationId = null;
      }

      StatusManager.showWarning(
        `Cancelled generation for ${cancelled.length} slides`
      );

      this.eventSystem.emit("content:generation-cancelled", {
        cancelledChunks: cancelled,
      });
    }
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get processing status
   */
  getProcessingStatus() {
    return {
      isGenerating: this.currentlyGenerating.size > 0,
      generatingCount: this.currentlyGenerating.size,
      generatingChunks: Array.from(this.currentlyGenerating),
      hasBatchOperation: !!this.batchOperationId,
      batchOperationId: this.batchOperationId,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.cancelAllGeneration();
    this.currentlyGenerating.clear();
    this.batchOperationId = null;

    console.log("ContentGenerator cleaned up");
  }
}

// Export for use in other modules
window.ContentGenerator = ContentGenerator;
