// Enhanced DebugLogger.js - Improved debug and logging with LLM conversation tracking
class DebugLogger {
  constructor() {
    this.logs = [];
    this.enabled = false;
    this.llmConversations = []; // Track LLM back-and-forth
    this.nudgingEvents = []; // Track nudging specifically
    this.currentAnalysisSession = null;
  }

  enable() {
    this.enabled = true;
    this.startAnalysisSession();
  }

  disable() {
    this.enabled = false;
    this.endAnalysisSession();
  }

  isEnabled() {
    return this.enabled;
  }

  startAnalysisSession() {
    this.currentAnalysisSession = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      llmCalls: 0,
      buttonsProcessed: 0,
      nudgingEvents: 0,
      mode: null,
    };
  }

  endAnalysisSession() {
    if (this.currentAnalysisSession) {
      this.currentAnalysisSession.endTime = new Date().toISOString();
      this.currentAnalysisSession.duration =
        new Date(this.currentAnalysisSession.endTime) -
        new Date(this.currentAnalysisSession.startTime);
    }
  }

  // Enhanced LLM conversation tracking
  addLLMConversation(type, buttonInfo, request, response, metadata = {}) {
    if (!this.enabled) return;

    const conversation = {
      id: `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: type, // 'single_button_analysis', 'initial_detection', etc.
      buttonInfo: buttonInfo,
      request: {
        prompt: request.prompt || "No prompt captured",
        imageUrl: request.imageUrl || null,
        model: request.model || "gpt-4o",
        attempt: request.attempt || 1,
      },
      response: {
        raw: response.raw || "No raw response",
        parsed: response.parsed || null,
        parsing_successful: response.parsing_successful || false,
        response_type: response.response_type || "unknown",
      },
      metadata: {
        ...metadata,
        apiCallNumber: this.currentAnalysisSession
          ? ++this.currentAnalysisSession.llmCalls
          : 0,
        sessionId: this.currentAnalysisSession?.id || null,
      },
    };

    this.llmConversations.push(conversation);

    // Also add to regular logs for compatibility
    this.addLog(
      "llm-conversation",
      `LLM ${type} - ${buttonInfo?.name || "Unknown"}`,
      conversation
    );
  }

  // Enhanced nudging event tracking
  addNudgingEvent(buttonInfo, originalPosition, nudgeData, newPosition) {
    if (!this.enabled) return;

    const nudgingEvent = {
      id: `nudge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      buttonInfo: buttonInfo,
      originalPosition: originalPosition,
      nudgeData: {
        type: nudgeData.nudge_type || "unknown",
        direction: nudgeData.nudge_direction || "unknown",
        multiplier: nudgeData.nudge_multiplier || 0,
        nudgeX: nudgeData.nudgeX || 0,
        nudgeY: nudgeData.nudgeY || 0,
        systematicAnalysis: nudgeData.systematic_analysis || null,
      },
      newPosition: newPosition,
      metadata: {
        sessionId: this.currentAnalysisSession?.id || null,
        nudgeNumber: this.currentAnalysisSession
          ? ++this.currentAnalysisSession.nudgingEvents
          : 0,
      },
    };

    this.nudgingEvents.push(nudgingEvent);

    // Also add to regular logs
    this.addLog(
      "nudging-event",
      `Nudging applied to ${buttonInfo?.name || "Unknown"}`,
      nudgingEvent
    );
  }

  addLog(type, message, data = {}) {
    if (!this.enabled) return;

    this.logs.push({
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
      sessionId: this.currentAnalysisSession?.id || null,
    });
  }

  getLogs() {
    return this.logs;
  }

  getLLMConversations() {
    return this.llmConversations;
  }

  getNudgingEvents() {
    return this.nudgingEvents;
  }

  getAnalysisSession() {
    return this.currentAnalysisSession;
  }

  clear() {
    this.logs = [];
    this.llmConversations = [];
    this.nudgingEvents = [];
    this.currentAnalysisSession = null;
  }

  getLogsByType(type) {
    return this.logs.filter((log) => log.type === type);
  }

  // Generate enhanced HTML for debug panel with LLM conversation view
  generateLogHTML() {
    if (!this.enabled) {
      return "<p>Debug mode is disabled. Enable it to see detailed logs.</p>";
    }

    if (this.logs.length === 0) {
      return "<p>No logs available. Run an analysis to see detailed logs here.</p>";
    }

    return this.logs
      .map((entry) => {
        const typeClass = this.getDebugTypeClass(entry.type);
        let dataHtml = "";

        // Special handling for LLM conversations
        if (entry.type === "llm-conversation") {
          dataHtml = this.generateLLMConversationHTML(entry.data);
        } else if (entry.type === "nudging-event") {
          dataHtml = this.generateNudgingEventHTML(entry.data);
        } else if (entry.data && Object.keys(entry.data).length > 0) {
          dataHtml = `<pre class="debug-data">${JSON.stringify(
            entry.data,
            null,
            2
          )}</pre>`;
        }

        return `
                <div class="debug-entry ${typeClass}">
                    <div class="debug-header">
                        <span class="debug-type">${entry.type.toUpperCase()}</span>
                        <span class="debug-time">${new Date(
                          entry.timestamp
                        ).toLocaleTimeString()}</span>
                    </div>
                    <div class="debug-message">${entry.message}</div>
                    ${dataHtml}
                </div>
            `;
      })
      .join("");
  }

  generateLLMConversationHTML(conversation) {
    const requestSummary =
      conversation.request.prompt.length > 200
        ? conversation.request.prompt.substring(0, 200) + "..."
        : conversation.request.prompt;

    const responseSummary =
      conversation.response.raw.length > 300
        ? conversation.response.raw.substring(0, 300) + "..."
        : conversation.response.raw;

    return `
            <div class="llm-conversation-container">
                <div class="conversation-meta">
                    <span class="api-call-number">API Call #${
                      conversation.metadata.apiCallNumber
                    }</span>
                    <span class="button-info">Button: ${
                      conversation.buttonInfo?.name || "N/A"
                    }</span>
                    <span class="attempt-info">Attempt: ${
                      conversation.request.attempt
                    }</span>
                    <span class="parsing-status ${
                      conversation.response.parsing_successful
                        ? "success"
                        : "failed"
                    }">
                        ${
                          conversation.response.parsing_successful
                            ? "✅ Parsed"
                            : "❌ Failed"
                        }
                    </span>
                </div>
                
                <div class="conversation-content">
                    <div class="request-section">
                        <h6>🚀 Request to LLM:</h6>
                        <div class="request-content">
                            <div class="prompt-preview">${requestSummary}</div>
                            ${
                              conversation.request.imageUrl
                                ? `<div class="image-attachment">📷 Image attached</div>`
                                : '<div class="no-image">No image</div>'
                            }
                        </div>
                    </div>
                    
                    <div class="response-section">
                        <h6>🤖 LLM Response:</h6>
                        <div class="response-content">
                            <div class="response-type">Type: ${
                              conversation.response.response_type
                            }</div>
                            <div class="response-preview">${responseSummary}</div>
                            ${
                              conversation.response.parsed
                                ? `<div class="parsed-info">
                                    Corrections: ${
                                      conversation.response.parsed.corrections
                                        ?.length || 0
                                    } | 
                                    Confidence: ${
                                      conversation.response.parsed.confidence ||
                                      "N/A"
                                    }%
                                </div>`
                                : '<div class="no-parsing">No structured data extracted</div>'
                            }
                        </div>
                    </div>
                </div>
                
                <details class="full-conversation">
                    <summary>View Full Conversation</summary>
                    <div class="full-content">
                        <h6>Full Prompt:</h6>
                        <pre class="full-prompt">${
                          conversation.request.prompt
                        }</pre>
                        <h6>Full Response:</h6>
                        <pre class="full-response">${
                          conversation.response.raw
                        }</pre>
                    </div>
                </details>
            </div>
        `;
  }

  generateNudgingEventHTML(nudgeEvent) {
    const nudgeData = nudgeEvent.nudgeData;
    const systematicInfo = nudgeData.systematicAnalysis
      ? `
            <div class="systematic-analysis-info">
                <strong>Systematic Analysis:</strong>
                <div>Overlap: ${
                  nudgeData.systematicAnalysis.box_overlaps_button
                    ? "Yes"
                    : "No"
                }</div>
                <div>Direction: ${
                  nudgeData.systematicAnalysis.compass_direction || "N/A"
                }</div>
                <div>Overlap %: ${
                  nudgeData.systematicAnalysis.overlap_percentage || "N/A"
                }%</div>
            </div>
        `
      : '<div class="no-systematic">No systematic analysis data</div>';

    return `
            <div class="nudging-event-container">
                <div class="nudge-meta">
                    <span class="nudge-type ${nudgeData.type}">${
      nudgeData.type
    }</span>
                    <span class="nudge-multiplier">×${
                      nudgeData.multiplier
                    }</span>
                    <span class="nudge-direction">${nudgeData.direction}</span>
                </div>
                
                <div class="position-changes">
                    <div class="position-before">
                        <strong>Before:</strong> (${
                          nudgeEvent.originalPosition.x
                        }, ${nudgeEvent.originalPosition.y})
                    </div>
                    <div class="position-nudge">
                        <strong>Nudge:</strong> (${
                          nudgeData.nudgeX > 0 ? "+" : ""
                        }${nudgeData.nudgeX}, ${
      nudgeData.nudgeY > 0 ? "+" : ""
    }${nudgeData.nudgeY})
                    </div>
                    <div class="position-after">
                        <strong>After:</strong> (${nudgeEvent.newPosition.x}, ${
      nudgeEvent.newPosition.y
    })
                    </div>
                </div>
                
                ${systematicInfo}
            </div>
        `;
  }

  getDebugTypeClass(type) {
    const typeClasses = {
      info: "debug-info",
      "api-call": "debug-api-call",
      "api-response": "debug-api-response",
      "llm-conversation": "debug-llm-conversation",
      "nudging-event": "debug-nudging-event",
      slice: "debug-slice",
      crop: "debug-crop",
      math: "debug-math",
      grouping: "debug-grouping",
      decision: "debug-decision",
      success: "debug-success",
      error: "debug-error",
      cycle: "debug-cycle",
      refine: "debug-refine",
      coverage: "debug-coverage",
      fallback: "debug-fallback",
      feedback: "debug-feedback",
      "contextual-analysis": "debug-api-response",
      "single-button": "debug-single-button",
      "systematic-analysis": "debug-systematic-analysis",
      "systematic-nudging": "debug-systematic-nudging",
    };
    return typeClasses[type] || "debug-default";
  }

  // Analysis summary with focus on single-button and nudging
  getAnalysisSummary() {
    const summary = {
      totalLogs: this.logs.length,
      llmConversations: this.llmConversations.length,
      nudgingEvents: this.nudgingEvents.length,
      session: this.currentAnalysisSession,
      singleButtonAnalysis: {
        successful: this.llmConversations.filter(
          (c) => c.response.parsing_successful
        ).length,
        failed: this.llmConversations.filter(
          (c) => !c.response.parsing_successful
        ).length,
        retries: this.llmConversations.filter((c) => c.request.attempt > 1)
          .length,
      },
      nudgingStats: {
        majorRepositioning: this.nudgingEvents.filter(
          (n) => n.nudgeData.type === "major_repositioning"
        ).length,
        significantAdjustment: this.nudgingEvents.filter(
          (n) => n.nudgeData.type === "significant_adjustment"
        ).length,
        fineTuning: this.nudgingEvents.filter(
          (n) => n.nudgeData.type === "fine_tuning"
        ).length,
        systematicBased: this.nudgingEvents.filter(
          (n) => n.nudgeData.systematicAnalysis
        ).length,
      },
    };

    return summary;
  }

  // Export enhanced logs with LLM conversations and nudging events
  exportEnhancedLogs() {
    const logData = {
      exported_at: new Date().toISOString(),
      session: this.currentAnalysisSession,
      summary: this.getAnalysisSummary(),
      logs: this.logs,
      llm_conversations: this.llmConversations,
      nudging_events: this.nudgingEvents,
    };

    const jsonData = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `enhanced_debug_logs_${new Date().getTime()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  // Search functionality for LLM conversations
  searchLLMConversations(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.llmConversations.filter(
      (conv) =>
        conv.request.prompt.toLowerCase().includes(term) ||
        conv.response.raw.toLowerCase().includes(term) ||
        conv.buttonInfo?.name?.toLowerCase().includes(term) ||
        conv.type.toLowerCase().includes(term)
    );
  }

  // Search functionality for nudging events
  searchNudgingEvents(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.nudgingEvents.filter(
      (nudge) =>
        nudge.buttonInfo?.name?.toLowerCase().includes(term) ||
        nudge.nudgeData.type.toLowerCase().includes(term) ||
        nudge.nudgeData.direction.toLowerCase().includes(term)
    );
  }
}
