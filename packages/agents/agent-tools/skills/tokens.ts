import { token } from '@tsdi/ioc';
import { AgentSkillDefinition } from './types';

export const AGENT_SKILLS = token<AgentSkillDefinition[]>('AGENT_SKILLS');
