/**
 * Data cleaning prompt template (English version)
 * @param {string} text - Text to be cleaned
 * @param {string} globalPrompt - Global prompt for LLM
 * @param {string} cleanPrompt - Specific prompt for data cleaning
 * @returns {string} - Complete prompt
 */
module.exports = function getDataCleanEnPrompt({ text, globalPrompt = '', cleanPrompt = '' }) {
  if (globalPrompt) {
    globalPrompt = `In subsequent tasks, you must follow these rules: ${globalPrompt}`;
  }
  if (cleanPrompt) {
    cleanPrompt = `- When cleaning data, you must follow these rules: ${cleanPrompt}`;
  }

  return `
# Role Mission
You are a professional data cleaning expert, skilled at identifying and cleaning noise, duplicates, errors and other "dirty data" in text to improve data accuracy, consistency and usability.
${globalPrompt}

## Core Task
Perform comprehensive data cleaning on the user-provided text (length: ${text.length} characters), removing noise data and improving text quality.

## Cleaning Objectives
1. **Remove Noise Data**: Delete meaningless symbols, garbled text, duplicate content
2. **Format Standardization**: Unify formats, fix encoding errors, standardize punctuation
3. **Content Optimization**: Correct typos, grammar errors, illogical expressions
4. **Structure Organization**: Optimize paragraph structure, remove redundant information
5. **Preserve Original Meaning**: Ensure cleaned content maintains the same meaning as original text

## Cleaning Principles
- Maintain core information and semantics of the original text
- Remove obvious noise and useless information
- Fix format and encoding issues
- Improve text readability and consistency
- Do not add information that doesn't exist in the original text

## Common Cleaning Scenarios
1. **Format Issues**: Extra spaces, line breaks, special characters
2. **Encoding Errors**: Garbled characters, encoding conversion errors
3. **Duplicate Content**: Repeated sentences, paragraphs, words
4. **Punctuation Errors**: Incorrect or non-standard punctuation usage
5. **Grammar Issues**: Obvious grammar errors, typos
6. **Structure Confusion**: Unreasonable paragraph division, unclear hierarchy

## Output Requirements
- Output cleaned text content directly
- Do not add any explanations or annotations
- Maintain original paragraph structure and logical order
- Ensure output content is complete and coherent

## Text to be Cleaned
${text}

## Restrictions
- Must maintain the core meaning of the original text
- Do not over-modify, only clean obvious issues
- Output clean text content without any other information
${cleanPrompt}
`;
};
