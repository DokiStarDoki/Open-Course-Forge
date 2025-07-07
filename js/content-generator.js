/**
 * Course Forge MVP - Content Generator (FIXED LOADING STATES)
 * Handles content generation for slides using LLM service with proper status cleanup
 */

class ContentGenerator {
  constructor(stateManager, eventSystem, llmService) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.llmService = llmService;

    // Track currently generating slides to prevent duplicates
    this.currentlyGenerating = new Set();
    this.batchOperationId = null;
    this.batchProgress = null; // Track batch progress
    this.retryQueue = new Map(); // Store failed items for retry

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        "ContentGenerator initialized with enhanced batch processing"
      );
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

    this.eventSystem.on("content:retry-failed", () => {
      this.retryFailedGenerations();
    });
  }

  /**
   * ENHANCED: Generate content for a specific slide with better error handling
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

      // Validate LLM service
      if (!this.llmService) {
        throw new Error("AI service not available");
      }

      await this.llmService.ensureReady();

      // FIXED: Show loading with chunk-specific identifier
      StatusManager.showLoading(`Generating content for "${chunk.title}"...`, {
        chunkId: chunkId,
        priority: "high",
      });

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

      // FIXED: Clear loading state immediately after success
      StatusManager.hide();
      StatusManager.showSuccess(`Content generated for "${chunk.title}"`);

      this.eventSystem.emit("content:generated", {
        chunkId,
        slideType: chunk.slideType,
        content: generatedContent,
      });

      return generatedContent;
    } catch (error) {
      console.error(`Content generation failed for ${chunkId}:`, error);

      // FIXED: Clear loading state on error too
      StatusManager.hide();
      StatusManager.showError(`Generation failed: ${error.message}`);

      this.eventSystem.emit("content:generation-failed", {
        chunkId,
        error: error.message,
      });

      throw error;
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
   * ENHANCED: Generate content for all slides with resilient batch processing
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

    // Start batch operation with enhanced tracking
    this.batchOperationId = `batch-${Date.now()}`;
    this.batchProgress = {
      total: pendingChunks.length,
      completed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      startTime: Date.now(),
    };

    StatusManager.startBatchOperation(
      this.batchOperationId,
      `Generating content for ${pendingChunks.length} slides...`
    );

    console.log(
      `🚀 Starting batch generation for ${pendingChunks.length} slides`
    );

    // Process slides in smaller batches to avoid overwhelming the API
    const batchSize = 3; // Process 3 slides at a time
    const batches = this.chunkArray(pendingChunks, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `📦 Processing batch ${batchIndex + 1}/${batches.length} (${
          batch.length
        } slides)`
      );

      // Process slides in parallel within each batch
      const batchPromises = batch.map(async (chunk, slideIndex) => {
        const overallIndex = batchIndex * batchSize + slideIndex;

        try {
          // Show progress
          const progressMessage = `Generating "${chunk.title}" (${
            overallIndex + 1
          }/${pendingChunks.length})`;
          StatusManager.addBatchMessage(
            this.batchOperationId,
            progressMessage,
            `progress-${overallIndex}`
          );

          await this.generateSlideContent(chunk.id);

          this.batchProgress.successful++;
          this.batchProgress.completed++;

          console.log(
            `✅ Generated content for "${chunk.title}" (${this.batchProgress.completed}/${this.batchProgress.total})`
          );

          return { success: true, chunk };
        } catch (error) {
          this.batchProgress.failed++;
          this.batchProgress.completed++;
          this.batchProgress.errors.push({
            chunkId: chunk.id,
            chunkTitle: chunk.title,
            error: error.message,
          });

          // Add to retry queue for later
          this.retryQueue.set(chunk.id, {
            chunk,
            error: error.message,
            attempts: 1,
            lastAttempt: Date.now(),
          });

          console.error(
            `❌ Failed to generate content for "${chunk.title}":`,
            error.message
          );

          return { success: false, chunk, error: error.message };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (batchIndex < batches.length - 1) {
        const delayMs = 2000; // 2 second delay between batches
        console.log(`⏳ Waiting ${delayMs}ms before next batch...`);
        await this.delay(delayMs);
      }
    }

    // Complete batch operation with comprehensive results
    await this.completeBatchOperation();
  }

  /**
   * FIXED: Complete batch operation with proper status cleanup
   */
  async completeBatchOperation() {
    const { total, successful, failed, errors, startTime } = this.batchProgress;
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Create completion message
    const completionMessages = [];
    if (successful > 0) {
      completionMessages.push(`✅ ${successful} slides generated successfully`);
    }
    if (failed > 0) {
      completionMessages.push(`❌ ${failed} slides failed`);
    }
    completionMessages.push(`⏱️ Completed in ${duration} seconds`);

    const completionMessage = completionMessages.join(" | ");
    const completionType =
      failed === 0 ? "success" : failed < total ? "warning" : "error";

    // FIXED: Ensure proper batch completion
    StatusManager.completeBatchOperation(
      this.batchOperationId,
      completionMessage,
      completionType
    );

    // Show retry option if there were failures
    if (failed > 0) {
      setTimeout(() => {
        StatusManager.showActionMessage(
          `${failed} slides failed to generate. Click to retry failed slides.`,
          "Retry Failed",
          () => this.retryFailedGenerations(),
          "warning"
        );
      }, 2000);
    }

    // Emit detailed completion event
    this.eventSystem.emit("content:batch-generated", {
      total,
      successful,
      failed,
      errors,
      duration,
      retryQueueSize: this.retryQueue.size,
    });

    // Log detailed results if debugging
    if (CONFIG.DEBUG.ENABLED) {
      console.log("🏁 Batch generation complete:", {
        total,
        successful,
        failed,
        duration: `${duration}s`,
        successRate: `${Math.round((successful / total) * 100)}%`,
        errors: errors.map((e) => `${e.chunkTitle}: ${e.error}`),
      });
    }

    // Clean up batch state
    this.batchOperationId = null;
    this.batchProgress = null;
  }

  /**
   * ADDED: Retry failed generations
   */
  async retryFailedGenerations() {
    if (this.retryQueue.size === 0) {
      StatusManager.showInfo("No failed generations to retry");
      return;
    }

    const failedItems = Array.from(this.retryQueue.entries());
    const confirmed = confirm(
      `Retry generating content for ${failedItems.length} failed slides?`
    );
    if (!confirmed) return;

    StatusManager.showLoading(
      `Retrying ${failedItems.length} failed generations...`
    );

    let retrySuccessful = 0;
    let retryFailed = 0;

    for (const [chunkId, retryData] of failedItems) {
      try {
        console.log(`🔄 Retrying generation for "${retryData.chunk.title}"`);

        await this.generateSlideContent(chunkId);
        this.retryQueue.delete(chunkId);
        retrySuccessful++;

        console.log(`✅ Retry successful for "${retryData.chunk.title}"`);
      } catch (error) {
        retryFailed++;
        // Update retry data
        retryData.attempts++;
        retryData.lastAttempt = Date.now();
        retryData.error = error.message;

        console.error(
          `❌ Retry failed for "${retryData.chunk.title}":`,
          error.message
        );
      }

      // Small delay between retries
      await this.delay(1500);
    }

    const message = `Retry complete: ${retrySuccessful} successful, ${retryFailed} still failed`;
    const type = retryFailed === 0 ? "success" : "warning";
    StatusManager.show(message, type);

    this.eventSystem.emit("content:retry-completed", {
      attempted: failedItems.length,
      successful: retrySuccessful,
      failed: retryFailed,
      remainingInQueue: this.retryQueue.size,
    });
  }

  /**
   * ADDED: Clear retry queue
   */
  clearRetryQueue() {
    const clearedCount = this.retryQueue.size;
    this.retryQueue.clear();

    if (clearedCount > 0) {
      StatusManager.showSuccess(
        `Cleared ${clearedCount} items from retry queue`
      );
    }

    return clearedCount;
  }

  /**
   * ADDED: Get retry queue status
   */
  getRetryQueueStatus() {
    const queueItems = Array.from(this.retryQueue.entries()).map(
      ([chunkId, data]) => ({
        chunkId,
        chunkTitle: data.chunk.title,
        attempts: data.attempts,
        lastError: data.error,
        timeSinceLastAttempt: Date.now() - data.lastAttempt,
      })
    );

    return {
      size: this.retryQueue.size,
      items: queueItems,
    };
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
   * ENHANCED: Get generation statistics with more details
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
      batchInProgress: !!this.batchOperationId,
      batchProgress: this.batchProgress,
      retryQueueSize: this.retryQueue.size,
      llmServiceStatus: this.llmService
        ? {
            isReady: this.llmService.isReady,
            queueStatus: this.llmService.getQueueStatus
              ? this.llmService.getQueueStatus()
              : null,
          }
        : null,
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
        this.batchProgress = null;
      }

      // Clear LLM service queue if available
      if (this.llmService && this.llmService.clearQueue) {
        this.llmService.clearQueue();
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
   * ADDED: Utility method to chunk arrays into smaller batches
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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
      batchProgress: this.batchProgress,
      retryQueueSize: this.retryQueue.size,
    };
  }

  /**
   * ENHANCED: Cleanup resources with better state clearing
   */
  cleanup() {
    this.cancelAllGeneration();
    this.currentlyGenerating.clear();
    this.retryQueue.clear();
    this.batchOperationId = null;
    this.batchProgress = null;

    console.log("ContentGenerator cleaned up");
  }
}

// Export for use in other modules
window.ContentGenerator = ContentGenerator;
