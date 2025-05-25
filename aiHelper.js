// AI Course Creation Helper
const AIHelper = {
  // Replace this placeholder with your actual AI prompt
  aiPrompt: `[REPLACE THIS ENTIRE STRING WITH YOUR ACTUAL AI PROMPT]

Example structure for your prompt:
- Course creation instructions
- JSON format requirements  
- Slide type specifications
- Audio script guidelines
- etc.

Make sure to include placeholders where users should input:
- Course Name: 
- Course Length: 
- Learning Objectives: 
- Course Description: 
- Source Content/Topic: `,

  openAIHelpModal() {
    document.getElementById("aiHelpModal").classList.add("active");
    gsap.fromTo(
      "#aiHelpModal .modal-content",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  },

  closeAIHelpModal() {
    // Hide success message
    document.getElementById("copySuccess").style.display = "none";

    gsap.to("#aiHelpModal .modal-content", {
      scale: 0.8,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        document.getElementById("aiHelpModal").classList.remove("active");
      },
    });
  },

  async copyPromptToClipboard() {
    try {
      await navigator.clipboard.writeText(this.aiPrompt);

      // Show success message
      const successDiv = document.getElementById("copySuccess");
      successDiv.style.display = "block";

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        if (successDiv.style.display !== "none") {
          successDiv.style.display = "none";
        }
      }, 3000);
    } catch (err) {
      // Fallback for older browsers or when clipboard API fails
      const textArea = document.createElement("textarea");
      textArea.value = this.aiPrompt;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        document.getElementById("copySuccess").style.display = "block";
        setTimeout(() => {
          document.getElementById("copySuccess").style.display = "none";
        }, 3000);
      } catch (copyErr) {
        alert(
          "Failed to copy prompt. Please select and copy the text manually."
        );
        console.error("Copy failed:", copyErr);
      }

      document.body.removeChild(textArea);
    }
  },
};
