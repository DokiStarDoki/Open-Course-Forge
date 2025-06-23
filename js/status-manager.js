/**
 * Course Forge MVP - Status Management
 * Handles status messages, notifications, and user feedback
 */

class StatusManager {
  constructor() {
    this.statusBar = document.getElementById("statusBar");
    this.currentTimeout = null;
    this.messageQueue = [];
    this.isShowing = false;

    if (CONFIG.DEBUG.ENABLED) {
      console.log("StatusManager initialized");
    }
  }

  /**
   * Show a status message
   * @param {string} message - Message to display
   * @param {string} type - Message type: 'info', 'success', 'error', 'warning'
   * @param {number} duration - Duration in milliseconds
   */
  static show(
    message,
    type = "info",
    duration = CONFIG.UI.STATUS_MESSAGE_DURATION
  ) {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }

    StatusManager.instance.showMessage(message, type, duration);
  }

  /**
   * Show a success message
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds
   */
  static showSuccess(message, duration = CONFIG.UI.STATUS_MESSAGE_DURATION) {
    this.show(message, "success", duration);
  }

  /**
   * Show an error message
   * @param {string} message - Error message
   * @param {number} duration - Duration in milliseconds
   */
  static showError(message, duration = CONFIG.UI.ERROR_MESSAGE_DURATION) {
    this.show(message, "error", duration);
  }

  /**
   * Show a warning message
   * @param {string} message - Warning message
   * @param {number} duration - Duration in milliseconds
   */
  static showWarning(message, duration = CONFIG.UI.STATUS_MESSAGE_DURATION) {
    this.show(message, "warning", duration);
  }

  /**
   * Show an info message
   * @param {string} message - Info message
   * @param {number} duration - Duration in milliseconds
   */
  static showInfo(message, duration = CONFIG.UI.STATUS_MESSAGE_DURATION) {
    this.show(message, "info", duration);
  }

  /**
   * Show a loading message
   * @param {string} message - Loading message
   */
  static showLoading(message) {
    this.show(message, "loading", 0); // No auto-hide for loading messages
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
   * Instance method to show a message
   * @param {string} message - Message to display
   * @param {string} type - Message type
   * @param {number} duration - Duration in milliseconds
   */
  showMessage(message, type, duration) {
    const messageData = {
      message,
      type,
      duration,
      timestamp: Date.now(),
    };

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

    const { message, type, duration } = messageData;

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
      console.log(`Status (${type}): ${message}`);
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
   * Hide the current message
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

    // Process next message in queue after animation
    setTimeout(() => {
      if (this.messageQueue.length > 0) {
        const nextMessage = this.messageQueue.shift();
        this.displayMessage(nextMessage);
      }
    }, CONFIG.UI.ANIMATION_DURATION);
  }

  /**
   * Show a progress message with percentage
   * @param {string} message - Base message
   * @param {number} progress - Progress percentage (0-100)
   */
  static showProgress(message, progress) {
    const progressBar = Math.round(progress);
    const progressMessage = `${message} (${progressBar}%)`;
    this.show(progressMessage, "loading", 0);
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
   * Show multiple messages in sequence
   * @param {Array} messages - Array of message objects
   */
  static showSequence(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return;

    messages.forEach((msg, index) => {
      setTimeout(() => {
        const {
          message,
          type = "info",
          duration = CONFIG.UI.STATUS_MESSAGE_DURATION,
        } = msg;
        this.show(message, type, duration);
      }, index * (CONFIG.UI.STATUS_MESSAGE_DURATION + 500));
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
}

// Initialize status manager when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  StatusManager.getStatusBar();
});
