// Course Data Management
const CourseData = {
  courseData: {
    title: "Advanced Web Development Course",
    courseInfo: {
      header: "Course Overview",
      content:
        "This comprehensive course covers modern web development techniques, including React, Node.js, and database integration. You'll learn to build scalable, responsive applications from scratch.",
    },
    faq: {
      header: "Frequently Asked Questions",
      items: [
        {
          question: "How long is this course?",
          answer:
            "The course is designed to be completed in 8-12 weeks, with approximately 5-7 hours of study per week.",
        },
        {
          question: "Do I need prior experience?",
          answer:
            "Basic knowledge of HTML, CSS, and JavaScript is recommended but not strictly required.",
        },
        {
          question: "Is certification provided?",
          answer:
            "Yes, you'll receive a certificate of completion upon successfully finishing all modules and assessments.",
        },
      ],
    },
    textAndImage: {
      header: "Modern Development Practices",
      text: "In today's fast-paced development environment, it's crucial to follow best practices that ensure code quality, maintainability, and scalability. Our course emphasizes clean code principles, version control with Git, automated testing, and continuous integration workflows.",
      image:
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500&h=300&fit=crop",
    },
    textAndBullets: {
      header: "Key Learning Outcomes",
      text: "By the end of this course, you will have gained practical skills in modern web development:",
      bullets: [
        "Build responsive web applications using React and modern JavaScript",
        "Implement RESTful APIs with Node.js and Express",
        "Work with databases (MongoDB and PostgreSQL)",
        "Deploy applications to cloud platforms",
        "Implement testing strategies and CI/CD pipelines",
      ],
    },
    iconsWithTitles: {
      header: "Course Features",
      icons: [
        {
          icon: "book-open",
          title: "Comprehensive Curriculum",
          description: "20+ modules covering all aspects of web development",
        },
        {
          icon: "users",
          title: "Community Support",
          description: "Access to instructor and peer community",
        },
        {
          icon: "award",
          title: "Industry Recognition",
          description: "Certification valued by top tech companies",
        },
      ],
    },
    flipCards: [
      {
        front: "What is React?",
        back: "React is a JavaScript library for building user interfaces, particularly web applications. It uses a component-based architecture and virtual DOM for efficient rendering.",
      },
      {
        front: "RESTful APIs",
        back: "REST (Representational State Transfer) is an architectural style for designing networked applications, using standard HTTP methods like GET, POST, PUT, and DELETE.",
      },
      {
        front: "Database Design",
        back: "Good database design involves normalization, proper indexing, and choosing the right database type (SQL vs NoSQL) based on your application's needs.",
      },
      {
        front: "DevOps Practices",
        back: "DevOps combines development and operations to improve collaboration, automate processes, and deliver software more efficiently through CI/CD pipelines.",
      },
    ],
    multipleChoice: {
      question:
        "Which of the following is NOT a JavaScript framework or library?",
      options: ["React", "Vue.js", "Angular", "Python"],
      correctAnswer: 3,
      feedback: {
        correct:
          "Correct! Python is a programming language, not a JavaScript framework or library.",
        incorrect:
          "Incorrect. Python is a programming language, while the others are JavaScript frameworks/libraries.",
      },
    },
    tabs: [
      {
        title: "Frontend",
        content:
          "Learn HTML5, CSS3, JavaScript ES6+, React, and responsive design principles. Master component-based architecture and state management.",
      },
      {
        title: "Backend",
        content:
          "Explore Node.js, Express.js, RESTful API design, authentication, and server-side programming concepts.",
      },
      {
        title: "Database",
        content:
          "Work with both SQL (PostgreSQL) and NoSQL (MongoDB) databases. Learn schema design, queries, and optimization techniques.",
      },
      {
        title: "Deployment",
        content:
          "Deploy applications using cloud platforms like AWS, Heroku, and Netlify. Understand containerization with Docker.",
      },
    ],
    popups: [
      {
        title: "Prerequisites",
        content:
          "Before starting this course, make sure you have a basic understanding of HTML, CSS, and JavaScript fundamentals.",
      },
      {
        title: "Course Materials",
        content:
          "All course materials including video lectures, coding exercises, and project templates are available in your student dashboard.",
      },
      {
        title: "Support Resources",
        content:
          "Get help through our discussion forums, office hours, and one-on-one mentoring sessions.",
      },
      {
        title: "Career Services",
        content:
          "Access resume reviews, interview preparation, and job placement assistance through our career services team.",
      },
      {
        title: "Certification",
        content:
          "Upon completion, you'll receive a verified certificate that you can add to your LinkedIn profile and resume.",
      },
    ],
  },

  // Function to build slides array dynamically
  buildSlidesArray(data) {
    // If data already has a slides array, use it directly
    if (data.slides && Array.isArray(data.slides)) {
      return data.slides.map((slide) => ({
        type: slide.type,
        data: slide.data,
        estimatedTime: slide.estimatedTime,
        audioScript: slide.audioScript,
      }));
    }

    // Otherwise, build from legacy format for backwards compatibility
    const newSlides = [];

    if (data.title) {
      newSlides.push({
        type: "title",
        data: data.title,
        audioScript: data.titleAudioScript,
      });
    }

    if (data.courseInfo) {
      newSlides.push({
        type: "courseInfo",
        data: data.courseInfo,
        audioScript: data.courseInfo.audioScript,
      });
    }

    if (data.faq) {
      newSlides.push({
        type: "faq",
        data: data.faq,
        audioScript: data.faq.audioScript,
      });
    }

    if (data.textAndImage) {
      newSlides.push({
        type: "textAndImage",
        data: data.textAndImage,
        audioScript: data.textAndImage.audioScript,
      });
    }

    if (data.textAndBullets) {
      newSlides.push({
        type: "textAndBullets",
        data: data.textAndBullets,
        audioScript: data.textAndBullets.audioScript,
      });
    }

    if (data.iconsWithTitles) {
      newSlides.push({
        type: "iconsWithTitles",
        data: data.iconsWithTitles,
        audioScript: data.iconsWithTitles.audioScript,
      });
    }

    if (data.flipCards && data.flipCards.length > 0) {
      newSlides.push({
        type: "flipCards",
        data: data.flipCards,
        audioScript: data.flipCardsAudioScript,
      });
    }

    if (data.multipleChoice) {
      newSlides.push({
        type: "multipleChoice",
        data: data.multipleChoice,
        audioScript: data.multipleChoice.audioScript,
      });
    }

    if (data.tabs && data.tabs.length > 0) {
      newSlides.push({
        type: "tabs",
        data: data.tabs,
        audioScript: data.tabsAudioScript,
      });
    }

    if (data.popups && data.popups.length > 0) {
      newSlides.push({
        type: "popups",
        data: data.popups,
        audioScript: data.popupsAudioScript,
      });
    }

    return newSlides;
  },
};
