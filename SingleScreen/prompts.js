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
   * Generate chunks with learning science principles
   * Implements: Cognitive Load Theory, Progressive Difficulty, Spaced Learning
   */
  generateChunksPrompt(courseConfig) {
    const {
      title,
      targetAudience,
      learningObjectives,
      sourceContent,
      estimatedDuration,
    } = courseConfig;

    return `You are an expert instructional designer with deep knowledge of learning science principles. Create a course structure that optimizes learning effectiveness.

COURSE CONTEXT:
- Title: ${title}
- Target Audience: ${targetAudience}
- Duration: ${estimatedDuration}
- Learning Objectives: ${learningObjectives.join(", ")}

SOURCE CONTENT:
${sourceContent}

LEARNING SCIENCE REQUIREMENTS:
1. COGNITIVE LOAD THEORY: Chunk information to prevent cognitive overload
   - Each chunk should contain 3-7 key concepts maximum
   - Present information in logical, digestible segments
   - Include clear connections between concepts

2. BLOOM'S TAXONOMY PROGRESSION: Structure learning from basic to advanced
   - Start with foundational concepts (Remember/Understand)
   - Progress to application and analysis
   - Culminate in evaluation and creation activities

3. SPACED LEARNING: Build in reinforcement and review
   - Include review points at strategic intervals
   - Connect new concepts to previously learned material
   - Design for retention over time

4. ASSESSMENT ALIGNMENT: Ensure activities match learning objectives
   - Each chunk should clearly support specific learning objectives
   - Include formative assessment opportunities
   - Design summative assessments that measure objective achievement

5. ACTIVE LEARNING PRINCIPLES: Promote engagement and interaction
   - Include interactive elements in each chunk
   - Vary presentation formats to maintain engagement
   - Provide opportunities for practice and application

CHUNK STRUCTURE REQUIREMENTS:
Generate 6-12 chunks with this JSON structure:
{
  "chunks": [
    {
      "title": "Engaging, specific title",
      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create",
      "learningObjectiveAlignment": ["Which specific objectives this addresses"],
      "cognitiveLoad": "low|medium|high",
      "slideType": "title|courseInfo|textAndImage|textAndBullets|iconsWithTitles|multipleChoice|tabs|flipCards|faq|popups",
      "groundTruth": "Clear learning goal and pedagogical intent",
      "sourceContent": "Substantial content (200-400 words) that learners will read",
      "estimatedTime": "X minutes",
      "reinforcementStrategy": "How this chunk reinforces previous learning",
      "assessmentType": "formative|summative|none",
      "interactionLevel": "passive|active|interactive"
    }
  ]
}

PROGRESSION STRATEGY:
1. Foundation chunks (Bloom's: Remember/Understand) - 30%
2. Application chunks (Bloom's: Apply/Analyze) - 50% 
3. Synthesis chunks (Bloom's: Evaluate/Create) - 20%

Ensure chunks build progressively in cognitive complexity while maintaining appropriate cognitive load for ${targetAudience}.

RESPOND WITH VALID JSON ONLY.`;
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
