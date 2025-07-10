/**
 * Course Forge MVP - Event System
 * Handles event-driven communication between components
 */

class EventSystem {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;

    if (CONFIG.DEBUG.ENABLED) {
      console.log("EventSystem initialized");
    }
  }

  /**
   * Subscribe to an event
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(listener);

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Event listener added for: ${event}`);
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);

        if (CONFIG.DEBUG.ENABLED) {
          console.log(`Event listener removed for: ${event}`);
        }
      }
    }
  }

  /**
   * Subscribe to an event only once
   */
  once(event, listener) {
    const onceListener = (data) => {
      listener(data);
      this.off(event, onceListener);
    };

    this.on(event, onceListener);
  }

  /**
   * Emit an event
   */
  emit(event, data = null) {
    // Add to history
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Event emitted: ${event}`, data);
    }

    // Call all listeners for this event
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);

          // Emit error event
          this.emit("system:error", {
            originalEvent: event,
            error: error.message,
            stack: error.stack,
          });
        }
      });
    }
  }

  /**
   * Emit an event with delay
   */
  emitDelayed(event, data, delay) {
    setTimeout(() => {
      this.emit(event, data);
    }, delay);
  }

  /**
   * Get all listeners for an event
   */
  getListeners(event) {
    return this.listeners.get(event) || [];
  }

  /**
   * Get all registered events
   */
  getEvents() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get event history
   */
  getHistory(eventFilter = null) {
    if (eventFilter) {
      return this.eventHistory.filter((entry) => entry.event === eventFilter);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("All event listeners removed");
    }
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListenersForEvent(event) {
    this.listeners.delete(event);

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`All listeners removed for event: ${event}`);
    }
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event) {
    return this.listeners.has(event) && this.listeners.get(event).length > 0;
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    const info = {
      totalEvents: this.listeners.size,
      totalListeners: 0,
      events: {},
      historySize: this.eventHistory.length,
    };

    this.listeners.forEach((listeners, event) => {
      info.totalListeners += listeners.length;
      info.events[event] = listeners.length;
    });

    return info;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.removeAllListeners();
    this.clearHistory();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("EventSystem cleaned up");
    }
  }
}
