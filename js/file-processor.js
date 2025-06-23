/**
 * Course Forge MVP - File Processing
 * Handles file upload, parsing, and content extraction
 */

class FileProcessor {
  /**
   * Process a file based on its type
   * @param {File} file - File object to process
   * @returns {Promise<Object>} Processed file data
   */
  static async processFile(file) {
    // Validate file before processing
    this.validateFile(file);

    const extension = this.getFileExtension(file.name);

    if (CONFIG.DEBUG.ENABLED) {
      console.log(`Processing file: ${file.name} (${extension})`);
    }

    try {
      switch (extension) {
        case "txt":
          return await this.processTxtFile(file);
        case "docx":
          return await this.processDocxFile(file);
        case "json":
          return await this.processJsonFile(file);
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw new Error(`Failed to process ${file.name}: ${error.message}`);
    }
  }

  /**
   * Process multiple files
   * @param {FileList|Array} files - Files to process
   * @returns {Promise<Array>} Array of processed file data
   */
  static async processFiles(files) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.processFile(file);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error.message,
        });
      }
    }

    return { results, errors };
  }

  /**
   * Validate file before processing
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   */
  static validateFile(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    const extension = this.getFileExtension(file.name);
    if (!CONFIG.SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `${CONFIG.ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${extension}`
      );
    }

    if (file.size === 0) {
      throw new Error("File is empty");
    }
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Name of the file
   * @returns {string} File extension in lowercase
   */
  static getFileExtension(filename) {
    return filename.split(".").pop().toLowerCase();
  }

  /**
   * Process a text file
   * @param {File} file - Text file to process
   * @returns {Promise<Object>} Processed file data
   */
  static async processTxtFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target.result;

          if (!content || content.trim().length === 0) {
            throw new Error("Text file is empty");
          }

          const wordCount = this.getWordCount(content);

          resolve({
            type: "content",
            content: content,
            filename: file.name,
            size: file.size,
            wordCount: wordCount,
            processedAt: new Date().toISOString(),
            metadata: {
              encoding: "utf-8",
              lineCount: content.split("\n").length,
            },
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read text file"));
      };

      reader.readAsText(file, "utf-8");
    });
  }

  /**
   * Process a DOCX file
   * @param {File} file - DOCX file to process
   * @returns {Promise<Object>} Processed file data
   */
  static async processDocxFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          if (!window.mammoth) {
            throw new Error("Mammoth library not loaded");
          }

          const arrayBuffer = e.target.result;
          const result = await mammoth.extractRawText({ arrayBuffer });

          if (!result.value || result.value.trim().length === 0) {
            throw new Error("DOCX file contains no readable text");
          }

          const content = result.value;
          const wordCount = this.getWordCount(content);

          // Log any conversion messages/warnings
          if (result.messages && result.messages.length > 0) {
            console.warn("DOCX conversion warnings:", result.messages);
          }

          resolve({
            type: "content",
            content: content,
            filename: file.name,
            size: file.size,
            wordCount: wordCount,
            processedAt: new Date().toISOString(),
            metadata: {
              conversionMessages: result.messages || [],
              hasWarnings: result.messages && result.messages.length > 0,
            },
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read DOCX file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process a JSON file
   * @param {File} file - JSON file to process
   * @returns {Promise<Object>} Processed file data
   */
  static async processJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonText = e.target.result;

          if (!jsonText || jsonText.trim().length === 0) {
            throw new Error("JSON file is empty");
          }

          let data;
          try {
            data = JSON.parse(jsonText);
          } catch (parseError) {
            throw new Error(`Invalid JSON format: ${parseError.message}`);
          }

          // Determine if this is course data or content data
          const fileType = this.determineJsonType(data);

          const result = {
            filename: file.name,
            size: file.size,
            processedAt: new Date().toISOString(),
            metadata: {
              keys: Object.keys(data),
              dataType: fileType,
            },
          };

          if (fileType === "course") {
            result.type = "course";
            result.data = data;
          } else {
            result.type = "content";
            result.content = JSON.stringify(data, null, 2);
            result.wordCount = this.getWordCount(result.content);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read JSON file"));
      };

      reader.readAsText(file, "utf-8");
    });
  }

  /**
   * Determine if JSON data is course data or content data
   * @param {Object} data - Parsed JSON data
   * @returns {string} 'course' or 'content'
   */
  static determineJsonType(data) {
    if (!data || typeof data !== "object") {
      return "content";
    }

    // Check for course-specific properties
    const courseIndicators = [
      "slides",
      "chunks",
      "courseConfig",
      "generatedSlides",
      "version",
      "exportedAt",
    ];

    const hascourseIndicators = courseIndicators.some((key) =>
      data.hasOwnProperty(key)
    );

    // Additional check for course structure
    if (data.courseConfig && typeof data.courseConfig === "object") {
      return "course";
    }

    if (data.slides && Array.isArray(data.slides)) {
      return "course";
    }

    if (data.chunks && Array.isArray(data.chunks)) {
      return "course";
    }

    return hascourseIndicators ? "course" : "content";
  }

  /**
   * Get word count for text content
   * @param {string} text - Text to count words in
   * @returns {number} Word count
   */
  static getWordCount(text) {
    if (!text || typeof text !== "string") {
      return 0;
    }

    // Remove extra whitespace and split by whitespace
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return words.length;
  }

  /**
   * Get character count for text content
   * @param {string} text - Text to count characters in
   * @returns {Object} Character count information
   */
  static getCharacterCount(text) {
    if (!text || typeof text !== "string") {
      return { total: 0, withoutSpaces: 0 };
    }

    return {
      total: text.length,
      withoutSpaces: text.replace(/\s/g, "").length,
    };
  }

  /**
   * Validate content for course creation
   * @param {string} content - Content to validate
   * @returns {Object} Validation result
   */
  static validateContent(content) {
    const wordCount = this.getWordCount(content);
    const charCount = this.getCharacterCount(content);

    const result = {
      isValid: true,
      warnings: [],
      errors: [],
      stats: {
        wordCount,
        characterCount: charCount.total,
        characterCountWithoutSpaces: charCount.withoutSpaces,
      },
    };

    // Check minimum content
    if (wordCount < CONFIG.CONTENT.MIN_WORD_COUNT) {
      result.errors.push(
        `Content too short. Minimum ${CONFIG.CONTENT.MIN_WORD_COUNT} words required, got ${wordCount}`
      );
      result.isValid = false;
    }

    // Check maximum content
    if (wordCount > CONFIG.CONTENT.MAX_WORD_COUNT) {
      result.warnings.push(
        `Content is very long (${wordCount} words). Consider breaking it into smaller sections.`
      );
    }

    // Check for empty content
    if (!content || content.trim().length === 0) {
      result.errors.push("Content is empty");
      result.isValid = false;
    }

    return result;
  }

  /**
   * Extract text content from various sources
   * @param {Array} files - Array of processed files
   * @returns {string} Combined text content
   */
  static extractTextContent(files) {
    if (!files || !Array.isArray(files)) {
      return "";
    }

    const contentFiles = files.filter((file) => file.type === "content");

    if (contentFiles.length === 0) {
      return "";
    }

    // Combine content from multiple files
    const combinedContent = contentFiles
      .map((file) => {
        const separator = `\n\n=== ${file.filename} ===\n\n`;
        return separator + file.content;
      })
      .join("\n\n");

    return combinedContent.trim();
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  static formatFileSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return Math.round(size * 100) / 100 + " " + sizes[i];
  }

  /**
   * Get file type icon based on extension
   * @param {string} filename - Filename
   * @returns {string} Lucide icon name
   */
  static getFileTypeIcon(filename) {
    const extension = this.getFileExtension(filename);

    switch (extension) {
      case "txt":
        return "file-text";
      case "docx":
        return "file-text";
      case "json":
        return "file-code";
      default:
        return "file";
    }
  }

  /**
   * Check if browser supports required APIs
   * @returns {Object} Support information
   */
  static checkBrowserSupport() {
    const support = {
      fileReader: typeof FileReader !== "undefined",
      mammoth: typeof mammoth !== "undefined",
      dragAndDrop: "draggable" in document.createElement("div"),
      localStorage: (() => {
        try {
          localStorage.setItem("test", "test");
          localStorage.removeItem("test");
          return true;
        } catch (e) {
          return false;
        }
      })(),
    };

    support.allSupported = Object.values(support).every(Boolean);

    return support;
  }

  /**
   * Create a file from text content
   * @param {string} content - Text content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   * @returns {File} Created file object
   */
  static createFileFromText(content, filename, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Download processed content as file
   * @param {string} content - Content to download
   * @param {string} filename - Filename for download
   * @param {string} mimeType - MIME type
   */
  static downloadAsFile(content, filename, mimeType = "application/json") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the URL object
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Get processing statistics
   * @param {Array} files - Array of processed files
   * @returns {Object} Processing statistics
   */
  static getProcessingStats(files) {
    if (!files || !Array.isArray(files)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        totalWords: 0,
        fileTypes: {},
        contentFiles: 0,
        courseFiles: 0,
      };
    }

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      totalWords: 0,
      fileTypes: {},
      contentFiles: 0,
      courseFiles: 0,
    };

    files.forEach((file) => {
      stats.totalSize += file.size || 0;
      stats.totalWords += file.wordCount || 0;

      const extension = this.getFileExtension(file.filename);
      stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;

      if (file.type === "content") {
        stats.contentFiles++;
      } else if (file.type === "course") {
        stats.courseFiles++;
      }
    });

    return stats;
  }
}
