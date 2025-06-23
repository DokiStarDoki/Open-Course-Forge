/**
 * Course Forge MVP - Tab Management
 * Handles tab navigation, state, and UI updates
 */

class TabManager {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.tabButtons = new Map();
    this.tabPanels = new Map();
    this.progressSteps = new Map();

    this.initializeElements();
    this.initializeEventListeners();
    this.updateTabUI();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("TabManager initialized");
    }
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    // Tab buttons
    document.querySelectorAll("[data-tab]").forEach((button) => {
      const tabName = button.dataset.tab;
      this.tabButtons.set(tabName, button);
    });

    // Tab panels
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      const tabName = panel.id.replace("-panel", "");
      this.tabPanels.set(tabName, panel);
    });

    // Progress steps
    document.querySelectorAll("[data-step]").forEach((step) => {
      const stepName = step.dataset.step;
      this.progressSteps.set(stepName, step);
    });

    if (CONFIG.DEBUG.LOG_LEVEL === "debug") {
      console.log("Tab elements initialized:", {
        buttons: Array.from(this.tabButtons.keys()),
        panels: Array.from(this.tabPanels.keys()),
        steps: Array.from(this.progressSteps.keys()),
      });
    }
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Tab button clicks
    this.tabButtons.forEach((button, tabName) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(tabName);
      });
    });

    // State change listeners
    this.stateManager.subscribe("currentTab", (tab) => {
      this.updateTabUI(tab);
    });

    // Listen for validation changes that might enable/disable tabs
    this.stateManager.subscribe("courseConfig", () => {
      this.updateTabAvailability();
    });

    this.stateManager.subscribe("chunks", () => {
      this.updateTabAvailability();
    });

    // Custom events
    this.eventSystem.on("tab:enable", (tabName) => {
      this.enableTab(tabName);
    });

    this.eventSystem.on("tab:disable", (tabName) => {
      this.disableTab(tabName);
    });

    this.eventSystem.on("tab:switch", (tabName) => {
      this.switchTab(tabName);
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            this.switchTab("input");
            break;
          case "2":
            e.preventDefault();
            if (this.isTabEnabled("chunking")) {
              this.switchTab("chunking");
            }
            break;
          case "3":
            e.preventDefault();
            if (this.isTabEnabled("generation")) {
              this.switchTab("generation");
            }
            break;
        }
      }
    });
  }

  /**
   * Switch to a specific tab
   * @param {string} tabName - Name of the tab to switch to
   */
  switchTab(tabName) {
    if (!this.isValidTab(tabName)) {
      console.warn(`Invalid tab name: ${tabName}`);
      return false;
    }

    if (!this.isTabEnabled(tabName)) {
      StatusManager.showWarning(
        `Please complete the previous steps before accessing ${this.getTabDisplayName(
          tabName
        )}`
      );
      return false;
    }

    const currentTab = this.stateManager.getState("currentTab");

    // Check if we can leave the current tab
    if (!this.canLeaveTab(currentTab, tabName)) {
      return false;
    }

    // Update state
    this.stateManager.setState("currentTab", tabName);

    // Emit event
    this.eventSystem.emit("tab:changed", {
      from: currentTab,
      to: tabName,
    });

    // Scroll to top of content
    this.scrollToTop();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Switched tab: ${currentTab} → ${tabName}`);
    }

    return true;
  }

  /**
   * Update tab UI based on current state
   * @param {string} activeTab - Currently active tab
   */
  updateTabUI(activeTab = null) {
    const currentTab = activeTab || this.stateManager.getState("currentTab");

    // Update tab buttons
    this.tabButtons.forEach((button, tabName) => {
      const isActive = tabName === currentTab;
      button.classList.toggle("active", isActive);

      // Update ARIA attributes
      button.setAttribute("aria-selected", isActive);
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    // Update tab panels
    this.tabPanels.forEach((panel, tabName) => {
      const isActive = tabName === currentTab;
      panel.classList.toggle("active", isActive);
      panel.setAttribute("aria-hidden", !isActive);

      // Animate panel transition
      if (isActive) {
        this.animateTabIn(panel);
      }
    });

    // Update progress steps
    this.updateProgressSteps(currentTab);

    // Update page title
    this.updatePageTitle(currentTab);
  }

  /**
   * Update progress steps indicator
   * @param {string} currentTab - Currently active tab
   */
  updateProgressSteps(currentTab) {
    const tabOrder = ["input", "chunking", "generation"];
    const currentIndex = tabOrder.indexOf(currentTab);

    this.progressSteps.forEach((step, stepName) => {
      const stepIndex = tabOrder.indexOf(stepName);
      const isActive = stepName === currentTab;
      const isCompleted = stepIndex < currentIndex;

      step.classList.toggle("active", isActive);
      step.classList.toggle("completed", isCompleted);
    });
  }

  /**
   * Update tab availability based on current state
   */
  updateTabAvailability() {
    const courseConfig = this.stateManager.getState("courseConfig");
    const chunks = this.stateManager.getState("chunks");
    const generatedSlides = this.stateManager.getState("generatedSlides");

    // Input tab is always available
    this.enableTab("input");

    // Chunking tab requires valid course config
    const hasValidConfig = this.validateCourseConfig(courseConfig);
    if (hasValidConfig) {
      this.enableTab("chunking");
    } else {
      this.disableTab("chunking");
    }

    // Generation tab requires chunks
    const hasChunks = chunks && chunks.length > 0;
    if (hasChunks) {
      this.enableTab("generation");
    } else {
      this.disableTab("generation");
    }
  }

  /**
   * Validate course configuration
   * @param {Object} config - Course configuration
   * @returns {boolean} True if valid
   */
  validateCourseConfig(config) {
    if (!config) return false;

    const hasTitle =
      config.title &&
      config.title.trim().length >= CONFIG.VALIDATION.COURSE_TITLE.MIN_LENGTH;
    const hasObjectives =
      config.learningObjectives &&
      config.learningObjectives.length >=
        CONFIG.VALIDATION.LEARNING_OBJECTIVES.MIN_COUNT;
    const hasContent =
      config.sourceContent && config.sourceContent.trim().length > 0;

    return hasTitle && hasObjectives && hasContent;
  }

  /**
   * Enable a tab
   * @param {string} tabName - Tab to enable
   */
  enableTab(tabName) {
    const button = this.tabButtons.get(tabName);
    if (button) {
      button.disabled = false;
      button.setAttribute("aria-disabled", "false");
      button.classList.remove("disabled");
    }
  }

  /**
   * Disable a tab
   * @param {string} tabName - Tab to disable
   */
  disableTab(tabName) {
    const button = this.tabButtons.get(tabName);
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.classList.add("disabled");
    }
  }

  /**
   * Check if a tab is enabled
   * @param {string} tabName - Tab to check
   * @returns {boolean} True if enabled
   */
  isTabEnabled(tabName) {
    const button = this.tabButtons.get(tabName);
    return button ? !button.disabled : false;
  }

  /**
   * Check if a tab name is valid
   * @param {string} tabName - Tab name to validate
   * @returns {boolean} True if valid
   */
  isValidTab(tabName) {
    return this.tabButtons.has(tabName);
  }

  /**
   * Check if we can leave the current tab
   * @param {string} currentTab - Current tab
   * @param {string} targetTab - Target tab
   * @returns {boolean} True if we can leave
   */
  canLeaveTab(currentTab, targetTab) {
    // Add any validation logic here
    // For example, check if forms are valid, unsaved changes, etc.

    // For now, always allow tab switching
    return true;
  }

  /**
   * Get display name for a tab
   * @param {string} tabName - Tab name
   * @returns {string} Display name
   */
  getTabDisplayName(tabName) {
    const button = this.tabButtons.get(tabName);
    return button ? button.textContent.trim() : tabName;
  }

  /**
   * Animate tab panel entrance
   * @param {HTMLElement} panel - Panel element
   */
  animateTabIn(panel) {
    if (typeof gsap !== "undefined") {
      gsap.fromTo(
        panel,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    } else {
      // Fallback CSS animation
      panel.style.animation = "fadeIn 0.3s ease-out";
    }
  }

  /**
   * Scroll to top of tab content
   */
  scrollToTop() {
    const tabContent = document.querySelector(".tab-content");
    if (tabContent) {
      tabContent.scrollTop = 0;
    }

    // Also scroll window to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Update page title based on current tab
   * @param {string} tabName - Current tab name
   */
  updatePageTitle(tabName) {
    const baseTitleStuff = "Course Forge MVP";
    const tabTitles = {
      input: "Input & Configuration",
      chunking: "Content Chunking",
      generation: "Content Generation",
    };

    const tabTitle = tabTitles[tabName] || "";
    document.title = tabTitle
      ? `${tabTitle} - ${baseTitleStuff}`
      : baseTitleStuff;
  }

  /**
   * Get next available tab
   * @param {string} currentTab - Current tab
   * @returns {string|null} Next tab name or null
   */
  getNextTab(currentTab) {
    const tabOrder = ["input", "chunking", "generation"];
    const currentIndex = tabOrder.indexOf(currentTab);

    if (currentIndex < 0 || currentIndex >= tabOrder.length - 1) {
      return null;
    }

    const nextTab = tabOrder[currentIndex + 1];
    return this.isTabEnabled(nextTab) ? nextTab : null;
  }

  /**
   * Get previous available tab
   * @param {string} currentTab - Current tab
   * @returns {string|null} Previous tab name or null
   */
  getPreviousTab(currentTab) {
    const tabOrder = ["input", "chunking", "generation"];
    const currentIndex = tabOrder.indexOf(currentTab);

    if (currentIndex <= 0) {
      return null;
    }

    return tabOrder[currentIndex - 1];
  }

  /**
   * Navigate to next tab
   * @returns {boolean} True if navigation was successful
   */
  goToNextTab() {
    const currentTab = this.stateManager.getState("currentTab");
    const nextTab = this.getNextTab(currentTab);

    if (nextTab) {
      return this.switchTab(nextTab);
    }

    return false;
  }

  /**
   * Navigate to previous tab
   * @returns {boolean} True if navigation was successful
   */
  goToPreviousTab() {
    const currentTab = this.stateManager.getState("currentTab");
    const previousTab = this.getPreviousTab(currentTab);

    if (previousTab) {
      return this.switchTab(previousTab);
    }

    return false;
  }

  /**
   * Get current tab progress percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgressPercentage() {
    const tabOrder = ["input", "chunking", "generation"];
    const currentTab = this.stateManager.getState("currentTab");
    const currentIndex = tabOrder.indexOf(currentTab);

    if (currentIndex < 0) return 0;

    return Math.round(((currentIndex + 1) / tabOrder.length) * 100);
  }

  /**
   * Show tab completion status
   * @param {string} tabName - Tab name
   * @param {boolean} isComplete - Whether tab is complete
   */
  setTabComplete(tabName, isComplete) {
    const step = this.progressSteps.get(tabName);
    if (step) {
      step.classList.toggle("completed", isComplete);
    }

    const button = this.tabButtons.get(tabName);
    if (button) {
      button.classList.toggle("completed", isComplete);
    }
  }

  /**
   * Get tab completion status
   * @returns {Object} Tab completion status
   */
  getTabStatus() {
    const courseConfig = this.stateManager.getState("courseConfig");
    const chunks = this.stateManager.getState("chunks");
    const generatedSlides = this.stateManager.getState("generatedSlides");

    return {
      input: this.validateCourseConfig(courseConfig),
      chunking: chunks && chunks.length > 0,
      generation: generatedSlides && generatedSlides.length > 0,
    };
  }
}
