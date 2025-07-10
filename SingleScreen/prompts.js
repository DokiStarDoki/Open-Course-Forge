/**
 * Course Forge MVP - Prompts with Learning Science Principles
 * Implements cognitive load theory, spaced repetition, Bloom's taxonomy, and assessment alignment
 */

class CoursePrompts {
  constructor() {
    this.bloomsLevels = {
      remember: {
        order: 1,
        verbs: ["define", "list", "recall", "identify", "describe"],
      },
      understand: {
        order: 2,
        verbs: ["explain", "summarize", "interpret", "classify", "compare"],
      },
      apply: {
        order: 3,
        verbs: ["use", "implement", "demonstrate", "solve", "execute"],
      },
      analyze: {
        order: 4,
        verbs: [
          "examine",
          "break down",
          "differentiate",
          "investigate",
          "categorize",
        ],
      },
      evaluate: {
        order: 5,
        verbs: ["assess", "critique", "judge", "validate", "prioritize"],
      },
      create: {
        order: 6,
        verbs: ["design", "develop", "construct", "formulate", "compose"],
      },
    };
  }

  /**
   * PASS 1: Generate chunk structure/outline from course configuration
   * This creates the overall course structure without detailed content
   */
  generateChunkStructurePrompt(courseConfig, targetChunkCount) {
    const {
      title,
      targetAudience,
      learningObjectives,
      sourceContent,
      estimatedDuration,
    } = courseConfig;

    return `You are an expert instructional designer creating a course structure that optimizes learning effectiveness.

COURSE CONTEXT:
- Title: ${title}
- Target Audience: ${targetAudience}
- Duration: ${estimatedDuration}
- Target Chunks: ${targetChunkCount}
- Learning Objectives: ${learningObjectives.join(", ")}

SOURCE CONTENT OVERVIEW:
${sourceContent.substring(0, 3000)}${
      sourceContent.length > 3000
        ? "...[content truncated for structure planning]"
        : ""
    }

TASK: Create a ${targetChunkCount}-chunk course structure that follows learning science principles.

LEARNING SCIENCE REQUIREMENTS:
1. BLOOM'S TAXONOMY PROGRESSION: Structure from foundational to advanced
   - 30% Foundation (Remember/Understand)
   - 50% Application (Apply/Analyze) 
   - 20% Synthesis (Evaluate/Create)

2. COGNITIVE LOAD MANAGEMENT: Logical progression preventing overload

3. SPACED LEARNING: Build in review and reinforcement points

4. ASSESSMENT ALIGNMENT: Each chunk should clearly support learning objectives

REQUIRED OUTPUT FORMAT (JSON only):
{
  "courseStructure": {
    "totalChunks": ${targetChunkCount},
    "progressionStrategy": "Brief description of how chunks build on each other",
    "chunks": [
      {
        "order": 1,
        "title": "Engaging, specific title",
        "theme": "High-level topic/focus area",
        "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",
        "learningObjectiveAlignment": ["Which specific objectives this addresses"],
        "cognitiveLoad": "low|medium|high",
        "estimatedTime": "X minutes",
        "keyTopics": ["3-5 key topics this chunk should cover"],
        "reinforcementStrategy": "How this connects to previous chunks",
        "assessmentType": "formative|summative|none"
      }
    ]
  }
}

IMPORTANT: Respond with ONLY valid JSON. No additional text.`;
  }

  /**
   * PASS 2: Develop detailed content for a specific chunk
   */
  generateChunkContentPrompt(
    chunkStructure,
    courseConfig,
    allChunkStructures,
    chunkIndex
  ) {
    const { title, targetAudience, learningObjectives, sourceContent } =
      courseConfig;
    const currentChunk = chunkStructure;
    const previousChunks = allChunkStructures.slice(0, chunkIndex);
    const nextChunks = allChunkStructures.slice(chunkIndex + 1);

    return `You are an expert instructional designer developing detailed content for a specific course chunk.

COURSE CONTEXT:
- Title: ${title}
- Target Audience: ${targetAudience}
- Learning Objectives: ${learningObjectives.join(", ")}

CURRENT CHUNK (${chunkIndex + 1}/${allChunkStructures.length}):
- Title: ${currentChunk.title}
- Theme: ${currentChunk.theme}
- Bloom's Level: ${currentChunk.bloomsLevel}
- Key Topics: ${currentChunk.keyTopics.join(", ")}
- Learning Goals: ${currentChunk.learningObjectiveAlignment.join(", ")}

COURSE PROGRESSION CONTEXT:
Previous Chunks: ${previousChunks.map((c) => c.title).join(" → ")}
Next Chunks: ${nextChunks.map((c) => c.title).join(" → ")}

FULL SOURCE CONTENT:
${sourceContent}

TASK: Create substantial, pedagogically-optimized content for this specific chunk.

REQUIREMENTS:
1. CONTENT DEPTH: 300-500 words of substantial learning content
2. BLOOM'S ALIGNMENT: Content must require ${
      currentChunk.bloomsLevel
    } level thinking
3. CONTEXT AWARENESS: Connect to previous chunks, prepare for next chunks
4. AUDIENCE FOCUS: Written specifically for ${targetAudience}
5. OBJECTIVE ALIGNMENT: Directly support: ${currentChunk.learningObjectiveAlignment.join(
      ", "
    )}

REQUIRED OUTPUT FORMAT (JSON only):
{
  "chunkContent": {
    "title": "${currentChunk.title}",
    "groundTruth": "Clear pedagogical intent and learning goal for this chunk (100-150 words)",
    "sourceContent": "Substantial educational content that learners will read and learn from (300-500 words)",
    "connectionToPrevious": "How this builds on previous learning",
    "connectionToNext": "How this prepares for upcoming content",
    "keyTakeaways": ["3-5 essential points learners should remember"],
    "bloomsLevel": "${currentChunk.bloomsLevel}",
    "cognitiveLoad": "${currentChunk.cognitiveLoad}",
    "assessmentType": "${currentChunk.assessmentType}"
  }
}

IMPORTANT: Respond with ONLY valid JSON. No additional text.`;
  }

  /**
   * PASS 3: Optimize content for specific slide type
   */
  generateSlideFormatPrompt(chunkContent, slideType, courseConfig) {
    const { targetAudience } = courseConfig;
    const { title, groundTruth, sourceContent, bloomsLevel } = chunkContent;

    const basePrompt = `You are an expert instructional designer optimizing content for a specific slide format.

CONTENT TO FORMAT:
- Title: ${title}
- Learning Goal: ${groundTruth}
- Bloom's Level: ${bloomsLevel}
- Target Audience: ${targetAudience}
- Slide Type: ${slideType}

SOURCE CONTENT:
${sourceContent}

TASK: Transform the source content into an optimized ${slideType} slide that maximizes learning effectiveness.

PEDAGOGICAL PRINCIPLES:
1. COGNITIVE LOAD: Present information clearly for ${bloomsLevel} level
2. ENGAGEMENT: Format should enhance learner interaction
3. RETENTION: Use techniques that improve memory formation
4. VISUAL HIERARCHY: Information should flow logically`;

    return this.getSlideTypeOptimizationPrompt(
      slideType,
      bloomsLevel,
      basePrompt,
      chunkContent
    );
  }

  /**
   * Get slide-specific optimization prompts
   */
  getSlideTypeOptimizationPrompt(
    slideType,
    bloomsLevel,
    basePrompt,
    chunkContent
  ) {
    const prompts = {
      title: `${basePrompt}

Create an engaging title slide that activates prior knowledge and sets expectations.

JSON Response:
{
  "slideContent": {
    "header": "Compelling title that hints at learning value",
    "text": "2-3 sentences that activate prior knowledge and create interest",
    "audioScript": "Engaging narration that creates curiosity"
  }
}`,

      courseInfo: `${basePrompt}

Create a course information slide that clearly communicates outcomes and relevance.

JSON Response:
{
  "slideContent": {
    "header": "${chunkContent.title}",
    "text": "Clear description of what learners will achieve",
    "duration": "${chunkContent.estimatedTime || "3 minutes"}",
    "objectives": ["Specific learning outcomes for this section"],
    "audioScript": "Motivating overview that connects to learner goals"
  }
}`,

      textAndBullets: `${basePrompt}

Create bullet-point content optimized for ${bloomsLevel} level thinking.
Use chunking (3-7 bullets) to manage cognitive load.

JSON Response:
{
  "slideContent": {
    "header": "${chunkContent.title}",
    "text": "Context paragraph that sets up the bullets and connects to learning goals",
    "bullets": ["3-7 bullets that progress logically and support ${bloomsLevel} thinking"],
    "audioScript": "Narration that guides cognitive processing"
  }
}`,

      textAndImage: `${basePrompt}

Create content with visual-verbal optimization using dual coding theory.

JSON Response:
{
  "slideContent": {
    "header": "${chunkContent.title}",
    "text": "Content that works with visual elements to reduce cognitive load",
    "image": "Specific description of image that supports learning (not decorative)",
    "audioScript": "Narration that guides attention between text and visual"
  }
}`,

      multipleChoice: `${basePrompt}

Create assessment aligned with ${bloomsLevel} cognitive level.
Question should test ${bloomsLevel} thinking, not just recall.

JSON Response:
{
  "slideContent": {
    "question": "Question requiring ${bloomsLevel} level cognitive processing",
    "options": ["Correct answer", "Plausible distractor", "Another distractor", "Third distractor"],
    "correctAnswer": 0,
    "feedback": {
      "correct": "Reinforcement that explains why correct and connects to objectives",
      "incorrect": "Explanatory feedback that addresses misconceptions"
    },
    "audioScript": "Question presentation encouraging thoughtful consideration"
  }
}`,

      iconsWithTitles: `${basePrompt}

Create visual-spatial content using categorization and pattern recognition.

JSON Response:
{
  "slideContent": {
    "header": "${chunkContent.title}",
    "icons": [
      {
        "icon": "relevant icon name",
        "title": "Memorable category label",
        "description": "Concise explanation building understanding"
      }
    ],
    "audioScript": "Narration helping learners build mental models"
  }
}`,

      tabs: `${basePrompt}

Create tabbed content for comparative analysis and connection-making.

JSON Response:
{
  "slideContent": [
    {
      "title": "Descriptive tab label",
      "content": "Content enabling comparison and ${bloomsLevel} level analysis"
    }
  ]
}`,

      flipCards: `${basePrompt}

Create flip cards for active recall and spaced practice.

JSON Response:
{
  "slideContent": [
    {
      "front": "Recall prompt or question",
      "back": "Answer with elaborative details for deep understanding"
    }
  ]
}`,

      faq: `${basePrompt}

Create FAQ addressing anticipated learning challenges and misconceptions.

JSON Response:
{
  "slideContent": {
    "header": "Frequently Asked Questions",
    "items": [
      {
        "question": "Question addressing common learning challenge",
        "answer": "Clear answer that resolves confusion and builds understanding"
      }
    ],
    "audioScript": "Introduction explaining how FAQ supports learning"
  }
}`,

      popups: `${basePrompt}

Create popup content for just-in-time learning and cognitive scaffolding.

JSON Response:
{
  "slideContent": [
    {
      "title": "Popup title",
      "content": "Concise, relevant information supporting understanding"
    }
  ]
}`,
    };

    const prompt = prompts[slideType] || prompts.textAndBullets;
    return (
      prompt +
      "\n\nIMPORTANT: Respond with ONLY valid JSON. No additional text."
    );
  }

  /**
   * Calculate optimal chunk count based on duration
   */
  calculateOptimalChunkCount(durationString) {
    let minutes = 0;

    // Parse duration
    if (durationString.toLowerCase().includes("hour")) {
      const hourMatch = durationString.match(/(\d+(?:\.\d+)?)\s*hour/i);
      if (hourMatch) {
        minutes = parseFloat(hourMatch[1]) * 60;
      }
    }

    const minuteMatch = durationString.match(/(\d+(?:\.\d+)?)\s*min/i);
    if (minuteMatch) {
      minutes += parseFloat(minuteMatch[1]);
    }

    // If no time found, default to 45 minutes
    if (minutes === 0) {
      minutes = 45;
    }

    // Calculate chunks: 2 minutes per chunk average
    // Add welcome + overview + conclusion chunks
    const contentChunks = Math.round(minutes / 2);
    const totalChunks = Math.max(4, Math.min(15, contentChunks + 3));

    return {
      totalChunks,
      contentMinutes: minutes,
      averageChunkTime: Math.round(minutes / (totalChunks - 3)), // Excluding intro/outro chunks
    };
  }

  /**
   * Generate slide content with pedagogical optimization
   */
  generateSlideContentPrompt(
    chunk,
    courseConfig,
    bloomsLevel,
    previousChunks = []
  ) {
    const { slideType, title, sourceContent, groundTruth } = chunk;
    const { targetAudience } = courseConfig;

    const basePrompt = `You are an expert instructional designer creating pedagogically optimized slide content.

LEARNING CONTEXT:
- Chunk Title: ${title}
- Bloom's Level: ${bloomsLevel}
- Target Audience: ${targetAudience}
- Slide Type: ${slideType}
- Learning Goal: ${groundTruth}

SOURCE CONTENT:
${sourceContent}

PEDAGOGICAL PRINCIPLES:
1. COGNITIVE LOAD MANAGEMENT: Present information clearly and concisely
2. ACTIVE LEARNING: Include engagement elements appropriate for ${bloomsLevel} level
3. RETENTION OPTIMIZATION: Use techniques that enhance memory formation
4. ASSESSMENT ALIGNMENT: Content should enable objective measurement`;

    // Get specific prompt based on slide type and Bloom's level
    return this.getSlideTypePrompt(
      slideType,
      bloomsLevel,
      basePrompt,
      chunk,
      previousChunks
    );
  }

  /**
   * Get slide-specific prompts optimized for learning science
   */
  getSlideTypePrompt(
    slideType,
    bloomsLevel,
    basePrompt,
    chunk,
    previousChunks
  ) {
    const prompts = {
      title: `${basePrompt}

Create an engaging title slide that:
- Sets clear expectations for learning
- Activates prior knowledge
- Creates cognitive interest

JSON Response:
{
  "header": "Compelling title that hints at learning value",
  "text": "2-3 sentences that activate prior knowledge and set learning expectations",
  "audioScript": "Engaging narration that creates curiosity and readiness to learn"
}`,

      courseInfo: `${basePrompt}

Create a course information slide that:
- Clearly communicates learning outcomes
- Establishes relevance for the target audience
- Sets appropriate expectations for cognitive effort

JSON Response:
{
  "header": "Course title",
  "text": "Clear description of what learners will achieve",
  "duration": "Time commitment",
  "audience": "Target audience confirmation", 
  "objectives": ["Measurable learning outcomes aligned with Bloom's ${bloomsLevel}"],
  "audioScript": "Motivating overview that connects to learner goals"
}`,

      textAndBullets: `${basePrompt}

Create content optimized for ${bloomsLevel} level thinking:
- Use chunking to manage cognitive load (3-7 bullets max)
- Include connection to previous learning
- Design bullets for progressive understanding

JSON Response:
{
  "header": "Clear, action-oriented title",
  "text": "Context paragraph that connects to prior knowledge and sets up the bullets",
  "bullets": ["3-7 bullets that progress from simple to complex concepts"],
  "audioScript": "Narration that guides cognitive processing and highlights key connections"
}`,

      textAndImage: `${basePrompt}

Create content with visual-verbal processing optimization:
- Text and image should complement, not compete
- Use dual coding theory for better retention
- Include metacognitive prompts

JSON Response:
{
  "header": "Descriptive title",
  "text": "Content that works synergistically with visual elements to reduce cognitive load",
  "image": "Description of image that supports learning (not decorative)",
  "audioScript": "Narration that guides attention between text and visual elements"
}`,

      multipleChoice: `${basePrompt}

Create assessment aligned with ${bloomsLevel} cognitive level:
- Question should test ${bloomsLevel} level thinking
- Distractors should address common misconceptions
- Feedback should enhance learning, not just judge

JSON Response:
{
  "question": "Question that requires ${bloomsLevel} level cognitive processing",
  "options": ["Correct answer", "Plausible distractor based on misconception", "Another plausible distractor", "Third distractor"],
  "correctAnswer": 0,
  "feedback": {
    "correct": "Reinforcement that explains why the answer is correct and connects to learning objectives",
    "incorrect": "Explanatory feedback that addresses misconceptions and guides to correct understanding"
  },
  "audioScript": "Question presentation that encourages thoughtful consideration"
}`,

      iconsWithTitles: `${basePrompt}

Create content using visual-spatial organization:
- Icons should aid categorization and memory
- Use chunking principles (3-7 items)
- Support pattern recognition

JSON Response:
{
  "header": "Organizational title",
  "icons": [
    {
      "icon": "relevant icon name",
      "title": "Memorable category label", 
      "description": "Concise explanation that builds understanding"
    }
  ],
  "audioScript": "Narration that helps learners build mental models and see relationships"
}`,

      tabs: `${basePrompt}

Create tabbed content for comparative analysis:
- Each tab should represent a distinct but related concept
- Enable learners to make connections and contrasts
- Support ${bloomsLevel} level processing

JSON Response:
[
  {
    "title": "Descriptive tab label",
    "content": "Content that enables comparison and analysis"
  }
]`,

      flipCards: `${basePrompt}

Create flip cards for active recall and spaced practice:
- Front should trigger recall of important concepts
- Back should provide elaborative information
- Support long-term retention

JSON Response:
[
  {
    "front": "Recall prompt or question",
    "back": "Answer with elaborative details that deepen understanding"
  }
]`,

      faq: `${basePrompt}

Create FAQ that addresses anticipated learning challenges:
- Questions should reflect real learner difficulties
- Answers should clarify misconceptions
- Support knowledge construction

JSON Response:
{
  "header": "FAQ section title",
  "items": [
    {
      "question": "Question that addresses common learning challenge",
      "answer": "Clear, helpful answer that resolves confusion and builds understanding"
    }
  ],
  "audioScript": "Introduction that explains how the FAQ supports learning goals"
}`,

      popups: `${basePrompt}

Create popup content for just-in-time learning:
- Each popup should provide relevant elaboration
- Support cognitive scaffolding
- Reduce extraneous cognitive load

JSON Response:
[
  {
    "title": "Popup title",
    "content": "Concise, relevant information that supports understanding without overwhelming"
  }
]`,
    };

    return prompts[slideType] || prompts.textAndBullets;
  }

  /**
   * Generate assessment prompt with alignment principles
   */
  generateAssessmentPrompt(learningObjectives, bloomsLevel, courseContent) {
    return `Create assessment items aligned with learning science principles.

LEARNING OBJECTIVES: ${learningObjectives.join(", ")}
BLOOM'S LEVEL: ${bloomsLevel}
COURSE CONTENT: ${courseContent}

ASSESSMENT DESIGN PRINCIPLES:
1. CONSTRUCTIVE ALIGNMENT: Questions must directly measure stated objectives
2. COGNITIVE LEVEL MATCHING: Items should require ${bloomsLevel} level thinking
3. AUTHENTIC ASSESSMENT: Scenarios should reflect real-world application
4. FORMATIVE FEEDBACK: Include explanations that enhance learning

Create 3-5 assessment items with:
- Clear measurement of learning objectives
- Appropriate cognitive demand for ${bloomsLevel}
- Meaningful feedback for learning enhancement
- Real-world relevance

JSON Response:
{
  "assessments": [
    {
      "type": "multiple-choice|short-answer|scenario|performance",
      "objective": "Which learning objective this measures",
      "bloomsLevel": "${bloomsLevel}",
      "item": "Assessment question or prompt",
      "rubric": "Clear success criteria",
      "feedback": "Learning-enhancing feedback"
    }
  ]
}`;
  }

  /**
   * Generate spacing and review prompts
   */
  generateReviewPrompt(previousChunks, currentObjective) {
    return `Create review content that implements spaced learning principles.

PREVIOUS LEARNING: ${previousChunks.map((c) => c.title).join(", ")}
CURRENT OBJECTIVE: ${currentObjective}

SPACED LEARNING PRINCIPLES:
1. RETRIEVAL PRACTICE: Include opportunities to recall previous learning
2. ELABORATIVE CONNECTIONS: Help learners see relationships between concepts
3. PROGRESSIVE DIFFICULTY: Increase complexity of connections
4. LONG-TERM RETENTION: Design for knowledge that persists

Create review activities that:
- Activate recall of previous concepts
- Connect previous learning to current objective  
- Strengthen long-term retention
- Prepare cognitive foundation for new learning

JSON Response:
{
  "reviewActivities": [
    {
      "type": "recall|connection|application|synthesis",
      "prompt": "Activity prompt",
      "purpose": "Learning science rationale",
      "connection": "How this connects previous and new learning"
    }
  ]
}`;
  }

  /**
   * Get Bloom's level for learning objective
   */
  classifyBloomsLevel(learningObjective) {
    const objective = learningObjective.toLowerCase();

    for (const [level, data] of Object.entries(this.bloomsLevels)) {
      if (data.verbs.some((verb) => objective.includes(verb))) {
        return level;
      }
    }

    // Default classification based on common patterns
    if (objective.includes("know") || objective.includes("understand"))
      return "understand";
    if (objective.includes("apply") || objective.includes("use"))
      return "apply";
    if (objective.includes("analyze") || objective.includes("compare"))
      return "analyze";
    if (objective.includes("evaluate") || objective.includes("assess"))
      return "evaluate";
    if (objective.includes("create") || objective.includes("design"))
      return "create";

    return "understand"; // Safe default
  }

  /**
   * Get cognitive load recommendation
   */
  getCognitiveLoadRecommendation(
    bloomsLevel,
    audienceLevel,
    contentComplexity
  ) {
    const bloomsOrder = this.bloomsLevels[bloomsLevel]?.order || 2;

    // Simple algorithm for cognitive load assessment
    let load = 0;
    load += bloomsOrder; // Higher Bloom's = higher load
    load += contentComplexity; // Content complexity factor
    load +=
      audienceLevel === "beginner" ? 2 : audienceLevel === "advanced" ? -1 : 0;

    if (load <= 3) return "low";
    if (load <= 6) return "medium";
    return "high";
  }

  /**
   * Generate interaction level recommendation
   */
  getInteractionLevel(bloomsLevel, slideType) {
    const interactiveTypes = ["multipleChoice", "flipCards", "tabs", "popups"];
    const activeTypes = ["textAndBullets", "iconsWithTitles", "faq"];

    if (interactiveTypes.includes(slideType)) return "interactive";
    if (activeTypes.includes(slideType)) return "active";
    return "passive";
  }
}

// Global instance
window.CoursePrompts = CoursePrompts;
