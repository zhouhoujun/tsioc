import type { AgentCliProviderProfile, AgentCliSavedModelProfile } from './config';

/**
 * Model-config sanitization extracted from `config.ts` so the CLI config module
 * stays within its source-size budget. Reading `settings.json` must drop
 * invalid/placeholder values (`cancel`/`q` sentinels, empty profiles, dangling
 * routes) and the sanitized result is written back on self-heal.
 */

export function isCancelledConfigValue(value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === 'cancel' || normalized === '/cancel' || normalized === 'q';
}

export function hasInvalidConfigSentinel(model?: Partial<AgentCliProviderProfile>): boolean {
    if (!model) {
        return false;
    }
    return isCancelledConfigValue(model.provider)
        || isCancelledConfigValue(model.model)
        || isCancelledConfigValue(model.baseUrl)
        || isCancelledConfigValue(model.apiKey);
}

export function sanitizeModelProfile(model: Record<string, any>, isTopLevel = true): Partial<AgentCliProviderProfile> {
    const next: Record<string, any> = { ...model };
    if (next.profiles && typeof next.profiles === 'object' && !Array.isArray(next.profiles)) {
        const sanitizedProfiles = Object.entries(next.profiles as Record<string, any>)
            .reduce((profiles, [name, profile]) => {
                if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
                    return profiles;
                }
                const sanitized = sanitizeModelProfile(profile as Record<string, any>, false);
                if (hasInvalidConfigSentinel(sanitized) || !Object.keys(sanitized).length) {
                    return profiles;
                }
                const { profiles: _p, defaultProfile: _d, complexityRouting: _c, savedProfiles: _s, activeSavedProfile: _a, ...leaf } = sanitized; profiles[name] = leaf;
                return profiles;
            }, {} as Record<string, any>);
        if (Object.keys(sanitizedProfiles).length) {
            next.profiles = sanitizedProfiles;
        } else {
            delete next.profiles;
        }
    }
    if (next.defaultProfile && (!next.profiles || !next.profiles[next.defaultProfile])) {
        delete next.defaultProfile;
    }
    if (next.complexityRouting && typeof next.complexityRouting === 'object' && !Array.isArray(next.complexityRouting)) {
        const sanitizedRouting = Object.entries(next.complexityRouting as Record<string, any>)
            .reduce((routes, [key, entry]) => {
                if (typeof entry === 'string') {
                    if (next.profiles?.[entry]) {
                        routes[key] = entry;
                    }
                    return routes;
                }
                if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                    const sanitized = sanitizeModelProfile(entry as Record<string, any>, false);
                    if (!hasInvalidConfigSentinel(sanitized) && Object.keys(sanitized).length) {
                        routes[key] = sanitized;
                    }
                }
                return routes;
            }, {} as Record<string, any>);
        if (Object.keys(sanitizedRouting).length) {
            next.complexityRouting = sanitizedRouting;
        } else {
            delete next.complexityRouting;
        }
    }
    if (next.savedProfiles && typeof next.savedProfiles === 'object' && !Array.isArray(next.savedProfiles)) {
        const sanitizedSavedProfiles = Object.entries(next.savedProfiles as Record<string, any>)
            .reduce((profiles, [name, profile]) => {
                if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
                    return profiles;
                }
                const provider = String(profile.provider || '').trim();
                const flashModel = String(profile.flashModel || '').trim();
                const strongModel = String(profile.strongModel || '').trim();
                if (!provider || !flashModel || !strongModel) {
                    return profiles;
                }
                profiles[name] = {
                    name: String(profile.name || name),
                    provider,
                    flashModel,
                    strongModel,
                    baseUrl: profile.baseUrl ? String(profile.baseUrl) : undefined,
                    apiKey: profile.apiKey ? String(profile.apiKey) : undefined
                };
                return profiles;
            }, {} as Record<string, AgentCliSavedModelProfile>);
        if (Object.keys(sanitizedSavedProfiles).length) {
            next.savedProfiles = sanitizedSavedProfiles;
        } else {
            delete next.savedProfiles;
        }
    }
    if (next.activeSavedProfile && (!next.savedProfiles || !next.savedProfiles[next.activeSavedProfile])) {
        delete next.activeSavedProfile;
    }
    // A top-level cancel/q sentinel must never persist. Only the outermost call
    // strips it, so nested profiles keep their sentinels and stay detectable.
    if (isTopLevel) {
        for (const key of ['provider', 'model', 'baseUrl', 'apiKey'] as const) {
            if (isCancelledConfigValue((next as Record<string, any>)[key])) {
                delete (next as Record<string, any>)[key];
            }
        }
    }
    return next as Partial<AgentCliProviderProfile>;
}
