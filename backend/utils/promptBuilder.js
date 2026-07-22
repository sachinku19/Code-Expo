/**
 * Prompt Builder Utility
 * Constructs structured prompts for different AI coding tasks with robust output formatting.
 */

// Basic defense against prompt injection
const sanitizePrompt = (text = "") => {
  if (typeof text !== "string") return "";
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
};

const SYSTEM_IDENTITY = `You are ExpoAI, a world-class Senior Software Architect and AI Developer Assistant inside CodeExpo, a real-time collaborative workspace.
You provide clear, accurate, security-conscious, highly optimized code and explanations.
CRITICAL CODE QUALITY & COMMENTING RULE:
- DO NOT clutter or pollute code blocks with excessive, multi-line, or trivial inline comments (e.g., do NOT write comments explaining basic language syntax, return 0, or standard includes).
- Write clean, professional, concise, production-ready code with ZERO bloated inline comments inside the code block.
- Place all conceptual explanations and breakdowns in the markdown text section OUTSIDE the code block!
- Follow strict formatting instructions. If structured JSON is requested, reply ONLY with valid parseable JSON. No markdown codeblock wrapper around raw JSON unless explicitly allowed.`;

/**
 * Builds prompt for general chat
 */

const buildChatPrompt = (prompt, context = {}) => {
  const cleanPrompt = sanitizePrompt(prompt);
  const activeLang = context.language || "programming language";
  const codeContext = context.code ? `\n\nActive Code Context (${activeLang}):\n\`\`\`${activeLang}\n${context.code}\n\`\`\`` : "";

  return {
    systemPrompt: `${SYSTEM_IDENTITY}
User Name: ${context.username || "Developer"}.
CRITICAL LANGUAGE CONSTRAINT: The user's active workspace file language is strictly "${activeLang}". Unless the user explicitly requests a different programming language in their prompt, ALL code snippets, solutions, algorithms, and code examples MUST be written strictly in "${activeLang}" (e.g., if active language is C++ or cpp, generate valid C++ code with #include <iostream> and std::cout. NEVER default to Python, JavaScript, or any other language unless explicitly requested!).`,
    userPrompt: `User Request: ${cleanPrompt}\n\n[Active Workspace Language: ${activeLang}]${codeContext}`
  };
};

/**
 * Builds prompt for Explain Code
 */
const buildExplainPrompt = (code, language = "javascript", prompt = "") => {
  const cleanCode = sanitizePrompt(code);
  const extra = prompt ? `Specific question: ${sanitizePrompt(prompt)}\n` : "";

  return {
    systemPrompt: `${SYSTEM_IDENTITY}`,
    userPrompt: `Explain the following ${language} code clearly for developers.
${extra}
Break down:
1. Executive Summary
2. Core Logic & Step-by-Step Flow
3. Key Components & Functions
4. Edge Cases & Potential Risk Areas

Code:
\`\`\`${language}
${cleanCode}
\`\`\``
  };
};

/**
 * Builds prompt for Fix Bug
 */
const buildFixPrompt = (code, language = "javascript", prompt = "") => {
  const cleanCode = sanitizePrompt(code);
  const issueDesc = prompt ? `Reported issue / error: ${sanitizePrompt(prompt)}\n` : "";

  return {
    systemPrompt: `${SYSTEM_IDENTITY}`,
    userPrompt: `Analyze and fix bugs/issues in the following ${language} code.
${issueDesc}
Provide:
1. Explanation of root cause and bug fixes made
2. Complete fixed code block

Code:
\`\`\`${language}
${cleanCode}
\`\`\``
  };
};

/**
 * Builds prompt for Optimize Code
 */
const buildOptimizePrompt = (code, language = "javascript") => {
  const cleanCode = sanitizePrompt(code);

  return {
    systemPrompt: `${SYSTEM_IDENTITY} Output MUST be a valid raw JSON object strictly adhering to this structure:
{
  "beforeCode": "string",
  "afterCode": "string",
  "timeComplexityBefore": "string",
  "timeComplexityAfter": "string",
  "spaceComplexityBefore": "string",
  "spaceComplexityAfter": "string",
  "performanceGain": "string",
  "explanation": "string"
}`,
    userPrompt: `Optimize the following ${language} code for performance, readability, and memory efficiency. Return ONLY raw valid JSON matching the schema.

Code:
${cleanCode}`
  };
};

/**
 * Builds prompt for Code Review
 */
const buildReviewPrompt = (code, language = "javascript") => {
  const cleanCode = sanitizePrompt(code);

  return {
    systemPrompt: `${SYSTEM_IDENTITY} Output MUST be a valid raw JSON object strictly adhering to this structure:
{
  "overallScore": number (0-100),
  "readabilityScore": number (0-100),
  "maintainabilityScore": number (0-100),
  "performanceScore": number (0-100),
  "securityScore": number (0-100),
  "bestPractices": ["string"],
  "suggestions": ["string"],
  "improvedCode": "string",
  "summary": "string"
}`,
    userPrompt: `Perform a comprehensive senior code review on the following ${language} code. Return ONLY raw valid JSON matching the schema.

Code:
${cleanCode}`
  };
};

/**
 * Builds prompt for Generate Test Cases
 */
const buildGenerateTestsPrompt = (code, language = "javascript") => {
  const cleanCode = sanitizePrompt(code);

  return {
    systemPrompt: `${SYSTEM_IDENTITY} Output MUST be a valid raw JSON object strictly adhering to this structure:
{
  "unitTestFramework": "string",
  "sampleTests": [
    {"name": "string", "code": "string", "expected": "string"}
  ],
  "edgeCases": [
    {"scenario": "string", "code": "string", "expected": "string"}
  ],
  "largeInputs": [
    {"scenario": "string", "code": "string", "expected": "string"}
  ],
  "invalidInputs": [
    {"scenario": "string", "code": "string", "expected": "string"}
  ],
  "testSuiteCode": "string"
}`,
    userPrompt: `Generate comprehensive unit test cases for the following ${language} code covering normal execution, edge cases, large boundary inputs, and invalid inputs. Return ONLY raw valid JSON matching the schema.

Code:
${cleanCode}`
  };
};

/**
 * Builds prompt for Documentation
 */
const buildDocumentationPrompt = (code, language = "javascript") => {
  const cleanCode = sanitizePrompt(code);

  return {
    systemPrompt: `${SYSTEM_IDENTITY} Output MUST be a valid raw JSON object strictly adhering to this structure:
{
  "jsdocOrCommentsCode": "string",
  "functionDocs": "string",
  "apiDocs": "string",
  "readmeSection": "string"
}`,
    userPrompt: `Generate professional developer documentation for the following ${language} code including JSDoc/inline comments, function API docs, and a README section. Return ONLY raw valid JSON.

Code:
${cleanCode}`
  };
};

/**
 * Builds prompt for Language Conversion
 */
const buildConvertLanguagePrompt = (code, sourceLang = "javascript", targetLang = "python") => {
  const cleanCode = sanitizePrompt(code);

  return {
    systemPrompt: `${SYSTEM_IDENTITY}`,
    userPrompt: `Convert the following code from ${sourceLang} to ${targetLang}. Preserve logic, idiomatic conventions, and efficiency.
Provide:
1. Key differences and translation notes
2. Complete converted code in ${targetLang}

Code:
\`\`\`${sourceLang}
${cleanCode}
\`\`\``
  };
};

module.exports = {
  sanitizePrompt,
  buildChatPrompt,
  buildExplainPrompt,
  buildFixPrompt,
  buildOptimizePrompt,
  buildReviewPrompt,
  buildGenerateTestsPrompt,
  buildDocumentationPrompt,
  buildConvertLanguagePrompt
};
