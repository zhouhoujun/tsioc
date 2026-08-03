import { ApprovalRule, ApprovalCategory, classifyApprovalCategory } from '../tools/ToolApprovalManager';
import { AgentOptions, AgentSandboxOptions, defaultAgentOptions, mergeAgentOptions } from '../options';
import { DEFAULT_VERIFICATION_WRITE_TOOLS } from './VerificationGate';

/**
 * B4: versioned snapshot of the harness governance configuration.
 *
 * A HarnessProfile captures the runtime governance knobs that shape agent
 * behavior (approval rules, sandbox policy, repair/loop budgets, verification
 * write-tool set, granular approval categories) so they can be serialized,
 * versioned, compared, and rolled back — the runtime counterpart of the
 * Surface Host Adapter contract.
 *
 * Profiles are referenced from `AgentOptions.harnessProfile` either by a
 * built-in name or as an inline snapshot. Applying a profile fills governance
 * fields below explicit per-call options, so `mergeAgentOptions({ tools: {
 * requireApproval: [...] } })` still wins over the profile.
 */
export interface HarnessProfile {
    /** Stable profile name (used as a reference from AgentOptions.harnessProfile). */
    name: string;
    /** Profile schema/format version (HARNESS_PROFILE_VERSION). */
    version: number;
    /** Approval rules that gate tool execution. */
    requireApproval?: ApprovalRule[];
    /** Sandbox policy (mode + network destination allowlist). */
    sandbox?: AgentSandboxOptions;
    /** B2: max consecutive falsified rounds before a turn terminates. */
    maxRepairRounds?: number;
    /** A4: max loop-recovery prompt injections before a looping turn terminates. */
    maxLoopRecoveries?: number;
    /** B2: tool names treated as write operations for the declared-vs-actual diff check. */
    verificationWriteTools?: string[];
    /** Granular approval categories referenced by the approval rules (derived, informational). */
    granularCategories?: ApprovalCategory[];
    /** A7 placeholder: formatter command used for generated edits (not yet wired into AgentOptions). */
    formatter?: string | null;
}

export const HARNESS_PROFILE_VERSION = 1;

/**
 * The governance fields of AgentOptions that a profile may override, in a
 * stable order used by snapshots and diffs.
 */
export const HARNESS_PROFILE_FIELDS: (keyof HarnessProfile)[] = [
    'requireApproval',
    'sandbox',
    'maxRepairRounds',
    'maxLoopRecoveries',
    'verificationWriteTools',
    'granularCategories',
    'formatter'
];

/**
 * Extract the granular approval categories referenced by a set of approval
 * rules. Object rules contribute their declared category; string rules are
 * classified by name. Categories are returned in fixed definition order.
 */
export function deriveGranularCategories(rules: ApprovalRule[] | undefined): ApprovalCategory[] {
    if (!rules || !rules.length) {
        return [];
    }
    const categories = new Set<ApprovalCategory>();
    for (const rule of rules) {
        if (typeof rule === 'object' && rule && rule.category) {
            categories.add(rule.category);
            continue;
        }
        if (typeof rule === 'string') {
            const category = classifyApprovalCategory(rule);
            if (category) {
                categories.add(category);
            }
        }
    }
    return (['sandbox', 'network', 'mcp', 'skill'] as ApprovalCategory[]).filter(category => categories.has(category));
}

/**
 * Snapshot the governance-relevant fields of an AgentOptions object into a
 * versioned profile. The result is a plain JSON-serializable object.
 */
export function snapshotHarnessProfile(options: Partial<AgentOptions> | undefined, name = 'snapshot'): HarnessProfile {
    const profile: HarnessProfile = {
        name,
        version: HARNESS_PROFILE_VERSION
    };
    if (options) {
        if (options.tools?.requireApproval !== undefined) {
            profile.requireApproval = options.tools.requireApproval.slice();
        }
        if (options.sandbox) {
            profile.sandbox = {
                ...(options.sandbox.mode !== undefined ? { mode: options.sandbox.mode } : {}),
                ...(options.sandbox.networkAllowlist ? { networkAllowlist: options.sandbox.networkAllowlist.slice() } : {})
            };
        }
        if (options.maxRepairRounds !== undefined) {
            profile.maxRepairRounds = options.maxRepairRounds;
        }
        if (options.maxLoopRecoveries !== undefined) {
            profile.maxLoopRecoveries = options.maxLoopRecoveries;
        }
        if (options.verificationWriteTools !== undefined) {
            profile.verificationWriteTools = options.verificationWriteTools.slice();
        }
        if (options.hooks && typeof (options.hooks as any).formatter === 'string') {
            profile.formatter = (options.hooks as any).formatter;
        }
    }
    profile.granularCategories = deriveGranularCategories(profile.requireApproval);
    return profile;
}

/**
 * Convert a profile back into a partial AgentOptions containing only the
 * governance fields the profile defines. The result is safe to spread below
 * explicit user options.
 */
export function applyHarnessProfile(profile: HarnessProfile): Partial<AgentOptions> {
    const overlay: Partial<AgentOptions> = {};
    if (profile.requireApproval !== undefined) {
        overlay.tools = { requireApproval: profile.requireApproval.slice() };
    }
    if (profile.sandbox) {
        const sandbox: AgentSandboxOptions = {};
        if (profile.sandbox.mode !== undefined) {
            sandbox.mode = profile.sandbox.mode;
        }
        if (profile.sandbox.networkAllowlist !== undefined) {
            sandbox.networkAllowlist = profile.sandbox.networkAllowlist.slice();
        }
        overlay.sandbox = sandbox;
    }
    if (profile.maxRepairRounds !== undefined) {
        overlay.maxRepairRounds = profile.maxRepairRounds;
    }
    if (profile.maxLoopRecoveries !== undefined) {
        overlay.maxLoopRecoveries = profile.maxLoopRecoveries;
    }
    if (profile.verificationWriteTools !== undefined) {
        overlay.verificationWriteTools = profile.verificationWriteTools.slice();
    }
    return overlay;
}

function formatProfileValue(value: unknown): string {
    if (value === undefined || value === null) {
        return '(unset)';
    }
    if (Array.isArray(value)) {
        return `[${value.map(item => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ')}]`;
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * Produce a readable list of lines describing the governance differences
 * between two profiles. Fields with equal values are omitted.
 */
export function diffHarnessProfiles(left: HarnessProfile, right: HarnessProfile): string[] {
    const lines: string[] = [];
    for (const field of HARNESS_PROFILE_FIELDS) {
        const lv = left[field];
        const rv = right[field];
        if (JSON.stringify(lv) !== JSON.stringify(rv)) {
            lines.push(`${field}: ${formatProfileValue(lv)} → ${formatProfileValue(rv)}`);
        }
    }
    return lines;
}

/**
 * Serialize a profile to stable JSON (indented, newline-terminated).
 */
export function serializeHarnessProfile(profile: HarnessProfile): string {
    return JSON.stringify(profile, null, 2) + '\n';
}

/**
 * Parse a serialized profile. Throws when the payload is not a valid
 * HarnessProfile (missing name/version, or not an object).
 */
export function parseHarnessProfile(json: string): HarnessProfile {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid HarnessProfile: expected a JSON object.');
    }
    if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
        throw new Error("Invalid HarnessProfile: missing string field 'name'.");
    }
    if (typeof parsed.version !== 'number') {
        throw new Error("Invalid HarnessProfile: missing number field 'version'.");
    }
    return parsed as HarnessProfile;
}

/** The built-in default profile mirrors the governance of `defaultAgentOptions` (backward compatible). */
export function createDefaultHarnessProfile(): HarnessProfile {
    return snapshotHarnessProfile(defaultAgentOptions, 'default');
}

let builtinHarnessProfiles: Record<string, HarnessProfile> | undefined;

/**
 * Built-in profile registry, built lazily so the `default` profile can read
 * `defaultAgentOptions` after options.ts finishes initializing (avoids a
 * circular-init ordering hazard). 'default' reproduces the legacy governance
 * defaults exactly; 'strict' demonstrates a tightened profile (granular
 * network approval + no network-destination sandbox bypass + single-round
 * repair budget).
 */
export function getBuiltinHarnessProfiles(): Record<string, HarnessProfile> {
    if (!builtinHarnessProfiles) {
        builtinHarnessProfiles = {
            default: createDefaultHarnessProfile(),
            strict: {
                name: 'strict',
                version: HARNESS_PROFILE_VERSION,
                requireApproval: [
                    'shell.exec',
                    'fs.write',
                    'fs.delete',
                    'sudo.exec',
                    'deploy',
                    'playwright_browser',
                    { category: 'network', mode: 'ask' }
                ],
                sandbox: {
                    mode: 'network-block'
                },
                maxRepairRounds: 1,
                maxLoopRecoveries: 2,
                verificationWriteTools: DEFAULT_VERIFICATION_WRITE_TOOLS.slice(),
                granularCategories: ['network', 'sandbox']
            }
        };
    }
    return builtinHarnessProfiles;
}

/**
 * Resolve a profile reference (built-in name or inline snapshot) to a
 * HarnessProfile. Unknown names and malformed objects resolve to undefined so
 * callers can fall back to the legacy defaults without throwing.
 */
export function resolveHarnessProfile(ref: string | HarnessProfile | undefined): HarnessProfile | undefined {
    if (!ref) {
        return undefined;
    }
    if (typeof ref === 'string') {
        return getBuiltinHarnessProfiles()[ref];
    }
    if (typeof ref === 'object' && ref && typeof ref.name === 'string' && typeof ref.version === 'number') {
        return ref;
    }
    return undefined;
}

/**
 * Merge a profile reference into an AgentOptions-shaped object by applying the
 * profile's governance fields below the object's own explicit fields.
 * Used by mergeAgentOptions to honor AgentOptions.harnessProfile.
 */
export function applyHarnessProfileReference<T extends Partial<AgentOptions>>(options: T): T {
    if (!options || options.harnessProfile === undefined) {
        return options;
    }
    const profile = resolveHarnessProfile(options.harnessProfile as string | HarnessProfile);
    if (!profile) {
        return options;
    }
    const overlay = applyHarnessProfile(profile);
    const merged = mergeAgentOptions({
        ...options,
        ...overlay,
        tools: {
            ...overlay.tools,
            ...(options.tools ?? {})
        },
        sandbox: {
            ...(overlay.sandbox ?? {}),
            ...(options.sandbox ?? {})
        }
    });
    return merged as T;
}
