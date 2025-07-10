/**
 * Course Forge MVP - Status Manager
 * Handles user notifications and status messages
 */

class StatusManager {
  static instance = null;

  static getInstance() {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }
    return StatusManager.instance;
  }

  constructor() {
    this.statusElement = null;
    this.currentStatus = null;
    this.hideTimeout = null;
    this.messageQueue = [];
    this.isShowing = false;
    this.processingBatch = false;
    this.currentBatchId = null;

    this.init();
  }

  init() {
    // Create status element if it doesn't exist
    if (!document.getElementById("status-message")) {
      this.createStatusElement();
    }
    this.statusElement = document.getElementById("status-message");
  }

  createStatusElement() {
    const statusDiv = document.createElement("div");
    statusDiv.id = "status-message";
    statusDiv.className = "status-message";
    document.body.appendChild(statusDiv);
  }

  // Static methods for easy access
  static showSuccess(message, duration = 5000) {
    StatusManager.getInstance().show(message, "success", duration);
  }

  static showError(message, duration = 8000) {
    StatusManager.getInstance().show(message, "error", duration);
  }

  static showWarning(message, duration = 6000) {
    StatusManager.getInstance().show(message, "warning", duration);
  }

  static showInfo(message, duration = 4000) {
    StatusManager.getInstance().show(message, "info", duration);
  }

  static showLoading(message) {
    StatusManager.getInstance().show(message, "loading");
  }

  static hide() {
    StatusManager.getInstance().hide();
  }

  static isShowing() {
    return StatusManager.getInstance().isShowing;
  }

  static isProcessingBatch() {
    return StatusManager.getInstance().processingBatch;
  }

  static getCurrentBatchId() {
    return StatusManager.getInstance().currentBatchId;
  }

  static getQueueLength() {
    return StatusManager.getInstance().messageQueue.length;
  }

  static getDebugInfo() {
    const instance = StatusManager.getInstance();
    return {
      isShowing: instance.isShowing,
      processingBatch: instance.processingBatch,
      currentBatchId: instance.currentBatchId,
      queueLength: instance.messageQueue.length,
      currentStatus: instance.currentStatus,
    };
  }

  show(message, type = "info", duration = 5000) {
    if (!this.statusElement) {
      this.init();
    }

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.currentStatus = { message, type, duration };
    this.isShowing = true;

    this.statusElement.textContent = message;
    this.statusElement.className = `status-message ${type}`;

    // Force reflow
    this.statusElement.offsetHeight;

    this.statusElement.classList.add("show");

    // Auto-hide for non-loading messages
    if (type !== "loading") {
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, duration);
    }

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Status: ${type.toUpperCase()} - ${message}`);
    }
  }

  hide() {
    if (!this.statusElement) return;

    this.statusElement.classList.remove("show");
    this.isShowing = false;
    this.currentStatus = null;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Process next message in queue
    if (this.messageQueue.length > 0) {
      const next = this.messageQueue.shift();
      setTimeout(() => {
        this.show(next.message, next.type, next.duration);
      }, 100);
    }
  }

  // Batch processing for multiple operations
  startBatch(batchId) {
    this.processingBatch = true;
    this.currentBatchId = batchId;
    this.showLoading(`Processing batch: ${batchId}`);
  }

  updateBatch(message) {
    if (this.processingBatch) {
      this.show(message, "loading");
    }
  }

  endBatch(message = null, type = "success") {
    this.processingBatch = false;
    this.currentBatchId = null;

    if (message) {
      this.show(message, type);
    } else {
      this.hide();
    }
  }

  // Queue messages when busy
  queue(message, type = "info", duration = 5000) {
    if (this.isShowing || this.processingBatch) {
      this.messageQueue.push({ message, type, duration });
    } else {
      this.show(message, type, duration);
    }
  }

  // Clear all messages
  clear() {
    this.messageQueue = [];
    this.hide();
  }

  // Update current message without hiding
  update(message) {
    if (this.isShowing && this.currentStatus) {
      this.statusElement.textContent = message;
      this.currentStatus.message = message;
    }
  }

  // Static method for updating current message
  static update(message) {
    StatusManager.getInstance().update(message);
  }
}
