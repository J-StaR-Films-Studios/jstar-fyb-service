/**
 * Agents Index
 * 
 * Re-exports all agent definitions from the agents module.
 * 
 * @module lib/agents/index
 */

// Re-export agent definitions
export {
    academicAgent,
    createAcademicAgent,
    buildSystemPrompt,
    academicAgentMeta,
} from './academic-agent';

export type {
    AcademicAgentConfig,
    AcademicExecutionContext,
    AcademicAgentCallOptions,
    AcademicUIMessage,
} from './academic-agent';
