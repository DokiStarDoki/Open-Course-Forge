/**
 * Course Forge MVP - Status Management (FIXED RACE CONDITIONS)
 * Handles status messages, notifications, and user feedback with proper sequencing
 */

class StatusManager {
  constructor() {
    this.statusBar = document.getElementById("statusBar");
    this.currentTimeout = null;
    this.messageQueue = [];
    this.isShowing = false;
    this.isProcessingBatch = false; // NEW: Track batch operations
    this.batchOperationId = null; // NEW: Track current batch ID
    this.pendingMessages = new Map(); // NEW: Track pending async messages

    if (CONFIG.DEBUG.ENABLED) {
      console.log("StatusManager initialized with race condition prevention");
    }
  }

  /**
   * Show a status message with improved sequencing
   * @param {string} message - Message to display
   * @param {string} type - Message type: 'info', 'success', 'error', 'warning'
   * @param {number} duration - Duration in milliseconds
   * @param {Object} options - Additional options for sequencing
   */
  static show(
    message,
    type = "info",
    duration = CONFIG.UI.STATUS_MESSAGE_DURATION,
    options = {}
  ) {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }

    StatusManager.instance.showMessage(message, type, duration, options);
  }

  /**
   * Show a success message
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds
   * @param {Object} options - Additional options
   */
  static showSuccess(
    message,
    duration = CONFIG.UI.STATUS_MESSAGE_DURATION,
    options = {}
  ) {
    this.show(message, "success", duration, options);
  }

  /**
   * Show an error message
   * @param {string} message - Error message
   * @param {number} duration - Duration in milliseconds
   * @param {Object} options - Additional options
   */
  static showError(
    message,
    duration = CONFIG.UI.ERROR_MESSAGE_DURATION,
    options = {}
  ) {
    this.show(message, "error", duration, options);
  }

  /**
   * Show a warning message
   * @param {string} message - Warning message
   * @param {number} duration - Duration in milliseconds
   * @param {Object} options - Additional options
   */
  static showWarning(
    message,
    duration = CONFIG.UI.STATUS_MESSAGE_DURATION,
    options = {}
  ) {
    this.show(message, "warning", duration, options);
  }

  /**
   * Show an info message
   * @param {string} message - Info message
   * @param {number} duration - Duration in milliseconds
   * @param {Object} options - Additional options
   */
  static showInfo(
    message,
    duration = CONFIG.UI.STATUS_MESSAGE_DURATION,
    options = {}
  ) {
    this.show(message, "info", duration, options);
  }

  /**
   * Show a loading message with batch operation support
   * @param {string} message - Loading message
   * @param {Object} options - Options including batchId
   */
  static showLoading(message, options = {}) {
    const loadingOptions = {
      ...options,
      isLoading: true,
      batchId: options.batchId || null,
      priority: options.priority || "normal", // normal, high, batch-completion
    };

    this.show(message, "loading", 0, loadingOptions); // No auto-hide for loading messages
  }

  /**
   * NEW: Start a batch operation (like generating multiple slides)
   * @param {string} batchId - Unique identifier for this batch
   * @param {string} initialMessage - Initial message to show
   */
  static startBatchOperation(batchId, initialMessage) {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }

    const instance = StatusManager.instance;

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Starting batch operation: ${batchId}`);
    }

    // Clear any existing messages
    instance.clearQueue();
    instance.hideMessage();

    // Set batch state
    instance.isProcessingBatch = true;
    instance.batchOperationId = batchId;
    instance.pendingMessages.clear();

    // Show initial message
    this.showLoading(initialMessage, {
      batchId: batchId,
      priority: "high",
    });
  }

  /**
   * NEW: Add a message to a batch operation
   * @param {string} batchId - Batch identifier
   * @param {string} message - Message to show
   * @param {string} messageId - Unique message identifier
   */
  static addBatchMessage(batchId, message, messageId) {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }

    const instance = StatusManager.instance;

    // Only process if this is the current batch
    if (instance.batchOperationId !== batchId) {
      if (CONFIG.DEBUG.ENABLED) {
        console.warn(
          `Ignoring message for old batch: ${batchId}, current: ${instance.batchOperationId}`
        );
      }
      return;
    }

    // Add to pending messages
    instance.pendingMessages.set(messageId, {
      message,
      timestamp: Date.now(),
      batchId,
    });

    // Show the message with batch priority
    this.showLoading(message, {
      batchId: batchId,
      messageId: messageId,
      priority: "normal",
    });
  }

  /**
   * NEW: Complete a batch operation
   * @param {string} batchId - Batch identifier
   * @param {string} completionMessage - Final message to show
   * @param {string} type - Message type (success, error, etc.)
   */
  static completeBatchOperation(batchId, completionMessage, type = "success") {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }

    const instance = StatusManager.instance;

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Completing batch operation: ${batchId}`);
      console.log(`Pending messages: ${instance.pendingMessages.size}`);
    }

    // Only process if this is the current batch
    if (instance.batchOperationId !== batchId) {
      if (CONFIG.DEBUG.ENABLED) {
        console.warn(
          `Ignoring completion for old batch: ${batchId}, current: ${instance.batchOperationId}`
        );
      }
      return;
    }

    // Wait for any pending messages to finish, then show completion
    setTimeout(() => {
      // Clear batch state
      instance.isProcessingBatch = false;
      instance.batchOperationId = null;
      instance.pendingMessages.clear();

      // Clear queue and show completion message
      instance.clearQueue();
      instance.hideMessage();

      // Show completion message after a brief delay
      setTimeout(() => {
        this.show(completionMessage, type, CONFIG.UI.STATUS_MESSAGE_DURATION, {
          priority: "batch-completion",
        });
      }, 200);
    }, 300); // Wait 300ms for any racing messages to complete
  }

  /**
   * Hide the current status message
   */
  static hide() {
    if (StatusManager.instance) {
      StatusManager.instance.hideMessage();
    }
  }

  /**
   * Clear all queued messages
   */
  static clearQueue() {
    if (StatusManager.instance) {
      StatusManager.instance.messageQueue = [];
    }
  }

  /**
   * Instance method to show a message with improved logic
   * @param {string} message - Message to display
   * @param {string} type - Message type
   * @param {number} duration - Duration in milliseconds
   * @param {Object} options - Additional options
   */
  showMessage(message, type, duration, options = {}) {
    const messageData = {
      message,
      type,
      duration,
      timestamp: Date.now(),
      options,
    };

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Status message request:`, {
        message: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        type,
        batchId: options.batchId,
        priority: options.priority,
        isProcessingBatch: this.isProcessingBatch,
      });
    }

    // Handle different priority levels
    const priority = options.priority || "normal";

    if (priority === "batch-completion") {
      // Batch completion messages always show immediately
      this.clearQueue();
      this.displayMessage(messageData);
      return;
    }

    if (priority === "high") {
      // High priority messages clear queue and show immediately
      this.clearQueue();
      this.displayMessage(messageData);
      return;
    }

    // For batch operations, handle sequencing
    if (this.isProcessingBatch && options.batchId) {
      if (options.batchId !== this.batchOperationId) {
        // Ignore messages from old batch operations
        if (CONFIG.DEBUG.ENABLED) {
          console.log(`Ignoring message from old batch: ${options.batchId}`);
        }
        return;
      }

      // If currently showing a message and this is a batch message, queue it
      if (this.isShowing && priority === "normal") {
        this.messageQueue.push(messageData);
        return;
      }
    }

    // If currently showing a message, queue this one
    if (this.isShowing) {
      this.messageQueue.push(messageData);
      return;
    }

    this.displayMessage(messageData);
  }

  /**
   * Display a message immediately
   * @param {Object} messageData - Message data object
   */
  displayMessage(messageData) {
    if (!this.statusBar) {
      console.warn("Status bar element not found");
      return;
    }

    const { message, type, duration, options } = messageData;

    // Clear any existing timeout
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // Set message content
    this.statusBar.innerHTML = this.formatMessage(message, type);

    // Set CSS classes
    this.statusBar.className = `status-bar show ${type}`;
    this.isShowing = true;

    // Auto-hide after duration (if duration > 0)
    if (duration > 0) {
      this.currentTimeout = setTimeout(() => {
        this.hideMessage();
      }, duration);
    }

    // Log message if debugging
    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Status displayed (${type}):`, message.substring(0, 100));
    }
  }

  /**
   * Format message with icons and styling
   * @param {string} message - Message text
   * @param {string} type - Message type
   * @returns {string} Formatted HTML
   */
  formatMessage(message, type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
      loading: "⏳",
    };

    const icon = icons[type] || icons.info;

    if (type === "loading") {
      return `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="spinner"></div>
          <span>${message}</span>
        </div>
      `;
    }

    return `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * Hide the current message with improved queue processing
   */
  hideMessage() {
    if (!this.statusBar) return;

    // Clear timeout
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // Hide the status bar
    this.statusBar.classList.remove("show");
    this.isShowing = false;

    // Process next message in queue after animation, but respect batch operations
    setTimeout(() => {
      if (this.messageQueue.length > 0) {
        const nextMessage = this.messageQueue.shift();

        // Double-check batch operation validity
        if (nextMessage.options && nextMessage.options.batchId) {
          if (nextMessage.options.batchId !== this.batchOperationId) {
            // Skip this message, it's from an old batch
            if (CONFIG.DEBUG.ENABLED) {
              console.log(
                `Skipping queued message from old batch: ${nextMessage.options.batchId}`
              );
            }
            this.hideMessage(); // Process next message
            return;
          }
        }

        this.displayMessage(nextMessage);
      }
    }, CONFIG.UI.ANIMATION_DURATION);
  }

  /**
   * Clear all queued messages
   */
  clearQueue() {
    this.messageQueue = [];

    if (CONFIG.DEBUG.ENABLED && this.messageQueue.length > 0) {
      console.log(`Cleared ${this.messageQueue.length} queued messages`);
    }
  }

  /**
   * Show a progress message with percentage
   * @param {string} message - Base message
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} options - Additional options
   */
  static showProgress(message, progress, options = {}) {
    const progressBar = Math.round(progress);
    const progressMessage = `${message} (${progressBar}%)`;
    this.showLoading(progressMessage, options);
  }

  /**
   * Show a message with a custom action button
   * @param {string} message - Message text
   * @param {string} actionText - Button text
   * @param {Function} actionCallback - Button click callback
   * @param {string} type - Message type
   */
  static showActionMessage(message, actionText, actionCallback, type = "info") {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }

    const instance = StatusManager.instance;

    if (!instance.statusBar) return;

    // Clear any existing timeout
    if (instance.currentTimeout) {
      clearTimeout(instance.currentTimeout);
      instance.currentTimeout = null;
    }

    const actionId = `status-action-${Date.now()}`;

    // Create message with action button
    instance.statusBar.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span>${message}</span>
        <button id="${actionId}" style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
        ">
          ${actionText}
        </button>
      </div>
    `;

    instance.statusBar.className = `status-bar show ${type}`;
    instance.isShowing = true;

    // Add click handler
    const actionButton = document.getElementById(actionId);
    if (actionButton) {
      actionButton.addEventListener("click", () => {
        actionCallback();
        instance.hideMessage();
      });
    }

    // Auto-hide after 10 seconds for action messages
    instance.currentTimeout = setTimeout(() => {
      instance.hideMessage();
    }, 10000);
  }

  /**
   * Show a confirmation message
   * @param {string} message - Message text
   * @param {Function} onConfirm - Callback for confirm action
   * @param {Function} onCancel - Callback for cancel action
   */
  static showConfirm(message, onConfirm, onCancel = null) {
    this.showActionMessage(message, "Confirm", onConfirm, "warning");
  }

  /**
   * Show multiple messages in sequence with better timing
   * @param {Array} messages - Array of message objects
   */
  static showSequence(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const batchId = `sequence-${Date.now()}`;
    this.startBatchOperation(batchId, messages[0].message || "Processing...");

    messages.forEach((msg, index) => {
      setTimeout(() => {
        const {
          message,
          type = "info",
          duration = CONFIG.UI.STATUS_MESSAGE_DURATION,
        } = msg;

        if (index === messages.length - 1) {
          // Last message - complete the batch
          this.completeBatchOperation(batchId, message, type);
        } else {
          // Add to batch
          this.addBatchMessage(batchId, message, `seq-${index}`);
        }
      }, index * (CONFIG.UI.STATUS_MESSAGE_DURATION + 200));
    });
  }

  /**
   * Show a temporary overlay message (for important notifications)
   * @param {string} message - Message text
   * @param {string} type - Message type
   * @param {number} duration - Duration in milliseconds
   */
  static showOverlay(message, type = "info", duration = 3000) {
    const overlay = document.createElement("div");
    overlay.className = `overlay-message ${type}`;
    overlay.innerHTML = `
      <div class="overlay-content">
        <div class="overlay-text">${message}</div>
        <button class="overlay-close">&times;</button>
      </div>
    `;

    // Add styles
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const content = overlay.querySelector(".overlay-content");
    content.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      margin: 0 1rem;
      position: relative;
    `;

    const closeBtn = overlay.querySelector(".overlay-close");
    closeBtn.style.cssText = `
      position: absolute;
      top: 0.5rem;
      right: 0.75rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6b7280;
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    // Close handlers
    const closeOverlay = () => {
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    };

    closeBtn.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeOverlay();
      }
    });

    // Auto-close
    if (duration > 0) {
      setTimeout(closeOverlay, duration);
    }
  }

  /**
   * Get status bar element (create if not exists)
   * @returns {HTMLElement} Status bar element
   */
  static getStatusBar() {
    let statusBar = document.getElementById("statusBar");

    if (!statusBar) {
      statusBar = document.createElement("div");
      statusBar.id = "statusBar";
      statusBar.className = "status-bar";
      document.body.appendChild(statusBar);
    }

    return statusBar;
  }

  /**
   * Check if currently showing a message
   * @returns {boolean} True if showing a message
   */
  static isShowing() {
    return StatusManager.instance ? StatusManager.instance.isShowing : false;
  }

  /**
   * Get current message queue length
   * @returns {number} Number of queued messages
   */
  static getQueueLength() {
    return StatusManager.instance
      ? StatusManager.instance.messageQueue.length
      : 0;
  }

  /**
   * NEW: Check if currently processing a batch operation
   * @returns {boolean} True if processing batch
   */
  static isProcessingBatch() {
    return StatusManager.instance
      ? StatusManager.instance.isProcessingBatch
      : false;
  }

  /**
   * NEW: Get current batch operation ID
   * @returns {string|null} Current batch ID or null
   */
  static getCurrentBatchId() {
    return StatusManager.instance
      ? StatusManager.instance.batchOperationId
      : null;
  }
}

// Initialize status manager when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  StatusManager.getStatusBar();
});
