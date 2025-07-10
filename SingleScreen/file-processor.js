/**
 * Course Forge MVP - File Processor
 * Handles file upload, processing, and validation
 */

class FileProcessor {
  constructor() {
    this.supportedTypes = CONFIG.UPLOAD.ACCEPTED_TYPES;
    this.maxFileSize = CONFIG.UPLOAD.MAX_FILE_SIZE;
    this.maxFiles = CONFIG.UPLOAD.MAX_FILES;
  }

  /**
   * Check browser support for file operations
   */
  static checkBrowserSupport() {
    return {
      fileReader: typeof FileReader !== "undefined",
      dragAndDrop: "draggable" in document.createElement("div"),
      localStorage: typeof Storage !== "undefined",
      allSupported:
        typeof FileReader !== "undefined" &&
        "draggable" in document.createElement("div") &&
        typeof Storage !== "undefined",
    };
  }

  /**
   * Validate file before processing
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(
        `File size exceeds ${this.formatFileSize(this.maxFileSize)} limit`
      );
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();
    if (!this.supportedTypes.includes(fileExtension)) {
      errors.push(
        `File type ${fileExtension} not supported. Supported types: ${this.supportedTypes.join(
          ", "
        )}`
      );
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push("File name too long (max 255 characters)");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Process a single file
   */
  static async processFile(file) {
    return new Promise((resolve, reject) => {
      // Validate file first
      const processor = new FileProcessor();
      const validation = processor.validateFile(file);

      if (!validation.valid) {
        reject(new Error(validation.errors.join("; ")));
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        const content = e.target.result;

        // Process content based on file type
        const processedContent = processor.processFileContent(
          content,
          file.type,
          file.name
        );

        resolve({
          id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          extension: "." + file.name.split(".").pop().toLowerCase(),
          content: processedContent,
          originalContent: content,
          lastModified: file.lastModified,
          uploadedAt: new Date().toISOString(),
          processed: true,
        });
      };

      reader.onerror = function () {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      // Read file as text
      reader.readAsText(file);
    });
  }

  /**
   * Process file content based on type
   */
  processFileContent(content, mimeType, fileName) {
    const extension = "." + fileName.split(".").pop().toLowerCase();

    switch (extension) {
      case ".md":
        return this.processMarkdown(content);
      case ".txt":
        return this.processPlainText(content);
      case ".pdf":
        // PDF processing would need additional library
        return content;
      case ".doc":
      case ".docx":
        // Word processing would need additional library
        return content;
      default:
        return content;
    }
  }

  /**
   * Process markdown content
   */
  processMarkdown(content) {
    // Basic markdown processing - remove markdown syntax for plain text
    return content
      .replace(/^#{1,6}\s+/gm, "") // Remove headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove links, keep text
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
      .trim();
  }

  /**
   * Process plain text content
   */
  processPlainText(content) {
    // Clean up plain text
    return content
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\n{3,}/g, "\n\n") // Reduce multiple line breaks
      .trim();
  }

  /**
   * Process multiple files
   */
  static async processMultipleFiles(files) {
    const results = [];
    const processor = new FileProcessor();

    // Check file count limit
    if (files.length > processor.maxFiles) {
      throw new Error(
        `Too many files. Maximum ${processor.maxFiles} files allowed.`
      );
    }

    for (const file of files) {
      try {
        const processed = await FileProcessor.processFile(file);
        results.push(processed);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          error: error.message,
          uploadedAt: new Date().toISOString(),
          processed: false,
        });
      }
    }

    return results;
  }

  /**
   * Download content as file
   */
  static downloadAsFile(content, filename, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Get file extension
   */
  getFileExtension(filename) {
    return "." + filename.split(".").pop().toLowerCase();
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(filename) {
    const extension = this.getFileExtension(filename);
    return this.supportedTypes.includes(extension);
  }

  /**
   * Get supported file types as string
   */
  getSupportedTypesString() {
    return this.supportedTypes.join(", ");
  }

  /**
   * Extract text content from all files
   */
  static extractTextFromFiles(files) {
    return files
      .filter((file) => file.processed && !file.error)
      .map((file) => {
        const separator = `\n\n--- ${file.name} ---\n\n`;
        return separator + file.content;
      })
      .join("\n\n");
  }

  /**
   * Validate files array
   */
  static validateFiles(files) {
    const errors = [];

    if (!Array.isArray(files)) {
      errors.push("Files must be an array");
      return { valid: false, errors };
    }

    if (files.length === 0) {
      errors.push("At least one file is required");
      return { valid: false, errors };
    }

    const processor = new FileProcessor();

    if (files.length > processor.maxFiles) {
      errors.push(
        `Too many files. Maximum ${processor.maxFiles} files allowed.`
      );
    }

    let totalSize = 0;
    files.forEach((file, index) => {
      if (file.error) {
        errors.push(`File ${index + 1} (${file.name}): ${file.error}`);
      } else {
        totalSize += file.size;
      }
    });

    if (totalSize > processor.maxFileSize * processor.maxFiles) {
      errors.push(
        `Total file size too large. Maximum ${processor.formatFileSize(
          processor.maxFileSize * processor.maxFiles
        )} allowed.`
      );
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      totalSize: totalSize,
      processedFiles: files.filter((f) => !f.error).length,
    };
  }

  /**
   * Create file input element
   */
  static createFileInput(options = {}) {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = options.multiple !== false;
    input.accept = options.accept || CONFIG.UPLOAD.ACCEPTED_TYPES.join(",");
    input.style.display = "none";

    return input;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Nothing to cleanup for now
  }
}
