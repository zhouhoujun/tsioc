export interface AgentPersonalityPreset {
    tone: string;
}

export const AGENT_PERSONALITY_PRESETS: Record<string, AgentPersonalityPreset> = {
    concise: { tone: 'Be concise. Prefer short, direct answers with minimal filler.' },
    explanatory: { tone: 'Explain your reasoning step by step before answering.' },
    professional: { tone: 'Use a formal, professional register with precise technical language.' },
    friendly: { tone: 'Use a warm, friendly register; keep answers approachable.' },
    terse: { tone: 'Answer with the fewest words possible; omit pleasantries.' }
};

export function buildPersonalityHint(preset?: string): string {
    const name = String(preset || '').trim();
    if (!name) {
        return '';
    }
    const resolved = AGENT_PERSONALITY_PRESETS[name] ?? AGENT_PERSONALITY_PRESETS[name.toLowerCase()];
    return resolved ? `\n\n## Personality\n${resolved.tone}` : '';
}
