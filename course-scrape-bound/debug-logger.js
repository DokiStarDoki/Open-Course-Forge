// DebugLogger.js - Debug and logging functionality
class DebugLogger {
    constructor() {
        this.logs = [];
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }

    addLog(type, message, data = {}) {
        if (!this.enabled) return;
        
        this.logs.push({
            timestamp: new Date().toISOString(),
            type,
            message,
            data
        });
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }

    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }

    // Generate HTML for debug panel
    generateLogHTML() {
        if (!this.enabled) {
            return '<p>Debug mode is disabled. Enable it to see detailed logs.</p>';
        }

        if (this.logs.length === 0) {
            return '<p>No logs available. Run an analysis to see detailed logs here.</p>';
        }

        return this.logs.map(entry => {
            const typeClass = this.getDebugTypeClass(entry.type);
            const dataHtml = entry.data && Object.keys(entry.data).length > 0 ? 
                `<pre class="debug-data">${JSON.stringify(entry.data, null, 2)}</pre>` : '';
            
            return `
                <div class="debug-entry ${typeClass}">
                    <div class="debug-header">
                        <span class="debug-type">${entry.type.toUpperCase()}</span>
                        <span class="debug-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="debug-message">${entry.message}</div>
                    ${dataHtml}
                </div>
            `;
        }).join('');
    }

    getDebugTypeClass(type) {
        const typeClasses = {
            'info': 'debug-info',
            'api-call': 'debug-api-call',
            'api-response': 'debug-api-response',
            'slice': 'debug-slice',
            'crop': 'debug-crop',
            'math': 'debug-math',
            'grouping': 'debug-grouping',
            'decision': 'debug-decision',
            'success': 'debug-success',
            'error': 'debug-error',
            'cycle': 'debug-cycle',
            'refine': 'debug-refine',
            'coverage': 'debug-coverage',
            'fallback': 'debug-fallback',
            'feedback': 'debug-feedback',
            'contextual-analysis': 'debug-api-response'
        };
        return typeClasses[type] || 'debug-default';
    }

    // Export logs as JSON
    exportLogs() {
        const logData = {
            exported_at: new Date().toISOString(),
            total_logs: this.logs.length,
            logs: this.logs
        };
        
        const jsonData = JSON.stringify(logData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug_logs_${new Date().getTime()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Get summary statistics
    getLogSummary() {
        const summary = {
            total_logs: this.logs.length,
            types: {},
            api_calls: 0,
            errors: 0,
            first_log: null,
            last_log: null
        };

        this.logs.forEach(log => {
            // Count by type
            summary.types[log.type] = (summary.types[log.type] || 0) + 1;
            
            // Count API calls
            if (log.type === 'api-call' || log.type === 'api-response') {
                summary.api_calls++;
            }
            
            // Count errors
            if (log.type === 'error') {
                summary.errors++;
            }
        });

        if (this.logs.length > 0) {
            summary.first_log = this.logs[0].timestamp;
            summary.last_log = this.logs[this.logs.length - 1].timestamp;
        }

        return summary;
    }

    // Filter logs by time range
    getLogsByTimeRange(startTime, endTime) {
        return this.logs.filter(log => {
            const logTime = new Date(log.timestamp);
            return logTime >= startTime && logTime <= endTime;
        });
    }

    // Search logs by message content
    searchLogs(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(term) ||
            log.type.toLowerCase().includes(term) ||
            JSON.stringify(log.data).toLowerCase().includes(term)
        );
    }
}