import { Type, token } from '@tsdi/ioc';

/**
 * Host-provided Markdown surface component.
 *
 * The default terminal host provides AgentConsoleMarkdownComponent; a DOM host
 * provides its native component once through DI. Renderers read this token and
 * never branch on the environment or inspect the current surface per row.
 */
export const AGENT_CONSOLE_MARKDOWN_COMPONENT = token<Type<any>>('AGENT_CONSOLE_MARKDOWN_COMPONENT');
