/**
 * Course Forge MVP - Event System
 * Custom event system for decoupled component communication
 */

class EventSystem {
  constructor() {
    this.events = new Map();
    this.onceEvents = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;

    if (CONFIG.DEBUG.ENABLED) {
      console.log("EventSystem initialized");
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} options - Additional options
   */
  on(event, callback, options = {}) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    // Store callback with options
    const callbackWrapper = {
      callback,
      options,
      id: Date.now() + Math.random(),
    };

    this.events.get(event).add(callbackWrapper);

    if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
      console.log(`Subscribed to event: ${event}`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event that only fires once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }

    const callbackWrapper = {
      callback,
      id: Date.now() + Math.random(),
    };

    this.onceEvents.get(event).add(callbackWrapper);

    if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
      console.log(`Subscribed to event (once): ${event}`);
    }

    // Return unsubscribe function
    return () => this.offOnce(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const toRemove = Array.from(callbacks).find(
        (wrapper) => wrapper.callback === callback
      );

      if (toRemove) {
        callbacks.delete(toRemove);
        if (callbacks.size === 0) {
          this.events.delete(event);
        }

        if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
          console.log(`Unsubscribed from event: ${event}`);
        }
      }
    }
  }

  /**
   * Unsubscribe from a once event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  offOnce(event, callback) {
    if (this.onceEvents.has(event)) {
      const callbacks = this.onceEvents.get(event);
      const toRemove = Array.from(callbacks).find(
        (wrapper) => wrapper.callback === callback
      );

      if (toRemove) {
        callbacks.delete(toRemove);
        if (callbacks.size === 0) {
          this.onceEvents.delete(event);
        }

        if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
          console.log(`Unsubscribed from once event: ${event}`);
        }
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Data to pass to callbacks
   */
  emit(event, data = null) {
    const eventInfo = {
      name: event,
      data,
      timestamp: new Date().toISOString(),
    };

    // Add to history
    this.addToHistory(eventInfo);

    // Emit to regular subscribers
    if (this.events.has(event)) {
      const callbacks = Array.from(this.events.get(event));

      callbacks.forEach((wrapper) => {
        try {
          // Check if callback should be called based on options
          if (this.shouldExecuteCallback(wrapper, eventInfo)) {
            wrapper.callback(data, eventInfo);
          }
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }

    // Emit to once subscribers
    if (this.onceEvents.has(event)) {
      const onceCallbacks = Array.from(this.onceEvents.get(event));

      onceCallbacks.forEach((wrapper) => {
        try {
          wrapper.callback(data, eventInfo);
        } catch (error) {
          console.error(`Error in once event callback for ${event}:`, error);
        }
      });

      // Clear once events after firing
      this.onceEvents.delete(event);
    }

    if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
      console.log(`Event emitted: ${event}`, data);
    }
  }

  /**
   * Emit an event asynchronously
   * @param {string} event - Event name
   * @param {*} data - Data to pass to callbacks
   */
  async emitAsync(event, data = null) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.emit(event, data);
        resolve();
      }, 0);
    });
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
      this.onceEvents.delete(event);

      if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
        console.log(`Removed all listeners for event: ${event}`);
      }
    } else {
      // Remove all listeners for all events
      this.events.clear();
      this.onceEvents.clear();

      if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
        console.log("Removed all event listeners");
      }
    }
  }

  /**
   * Get list of events with listeners
   * @returns {Array} Array of event names
   */
  getEventNames() {
    const regularEvents = Array.from(this.events.keys());
    const onceEvents = Array.from(this.onceEvents.keys());
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Get number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(event) {
    const regularCount = this.events.has(event)
      ? this.events.get(event).size
      : 0;
    const onceCount = this.onceEvents.has(event)
      ? this.onceEvents.get(event).size
      : 0;
    return regularCount + onceCount;
  }

  /**
   * Check if callback should be executed based on options
   * @param {Object} wrapper - Callback wrapper with options
   * @param {Object} eventInfo - Event information
   * @returns {boolean} Whether to execute callback
   */
  shouldExecuteCallback(wrapper, eventInfo) {
    const { options } = wrapper;

    // Check debounce
    if (options.debounce) {
      const now = Date.now();
      if (!wrapper.lastExecuted) {
        wrapper.lastExecuted = now;
        return true;
      }

      if (now - wrapper.lastExecuted < options.debounce) {
        return false;
      }

      wrapper.lastExecuted = now;
    }

    // Check throttle
    if (options.throttle) {
      const now = Date.now();
      if (!wrapper.lastExecuted) {
        wrapper.lastExecuted = now;
        return true;
      }

      if (now - wrapper.lastExecuted < options.throttle) {
        return false;
      }

      wrapper.lastExecuted = now;
    }

    // Check condition function
    if (options.condition && typeof options.condition === "function") {
      return options.condition(eventInfo.data, eventInfo);
    }

    return true;
  }

  /**
   * Add event to history
   * @param {Object} eventInfo - Event information
   */
  addToHistory(eventInfo) {
    this.eventHistory.push(eventInfo);

    // Keep history size under limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   * @param {string} eventName - Optional event name to filter by
   * @returns {Array} Event history
   */
  getHistory(eventName = null) {
    if (eventName) {
      return this.eventHistory.filter((event) => event.name === eventName);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];

    if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
      console.log("Event history cleared");
    }
  }

  /**
   * Create a namespaced event emitter
   * @param {string} namespace - Namespace prefix
   * @returns {Object} Namespaced event methods
   */
  namespace(namespace) {
    return {
      on: (event, callback, options) =>
        this.on(`${namespace}:${event}`, callback, options),
      once: (event, callback) => this.once(`${namespace}:${event}`, callback),
      off: (event, callback) => this.off(`${namespace}:${event}`, callback),
      emit: (event, data) => this.emit(`${namespace}:${event}`, data),
      emitAsync: (event, data) => this.emitAsync(`${namespace}:${event}`, data),
    };
  }

  /**
   * Wait for an event to be emitted
   * @param {string} event - Event name
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise that resolves when event is emitted
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const handler = (data) => {
        clearTimeout(timer);
        resolve(data);
      };

      this.once(event, handler);
    });
  }

  /**
   * Create a promise that resolves when multiple events are emitted
   * @param {Array} events - Array of event names
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise that resolves with array of event data
   */
  waitForAll(events, timeout = 10000) {
    return Promise.all(events.map((event) => this.waitFor(event, timeout)));
  }

  /**
   * Get debugging information
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      regularEvents: Array.from(this.events.entries()).map(
        ([event, callbacks]) => ({
          event,
          listenerCount: callbacks.size,
        })
      ),
      onceEvents: Array.from(this.onceEvents.entries()).map(
        ([event, callbacks]) => ({
          event,
          listenerCount: callbacks.size,
        })
      ),
      historySize: this.eventHistory.length,
      recentEvents: this.eventHistory.slice(-5),
    };
  }
}
