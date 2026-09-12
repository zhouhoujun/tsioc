import { AgentModelOptions } from './model/ModelProviderOptions';
import { BUILTIN_AGENT_PROVIDERS } from './model/provider-registry';
import { AgentHooksOptions } from './hooks/AgentHooks';
import { ApprovalRule } from './tools/ToolApprovalManager';
import { HarnessProfile, applyHarnessProfile, resolveHarnessProfile } from './harness/HarnessProfile';
import { AgentArchetype, DEFAULT_ARCHETYPE } from './archetype/AgentArchetype';
import { AgentDelegationMode, DEFAULT_DELEGATION_MODE } from './runtime/DelegationMode';

export interface AgentSessionOptions {
    summaryThreshold?: number;
    recentMessages?: number;
    /**
     * P74: automatically generate a session title after the first user message
     * (default: true). When false, titles are only set explicitly through
     * SessionStore.setTitle (e.g. the gateway `/title` route).
     */
    autoTitle?: boolean;
    /**
     * P74: automatically generate a display summary (persisted as
     * `focusSummary` project metadata) for new sessions (default: true).
     * Existing manually-set focusSummary values are never overwritten.
     */
    autoSummary?: boolean;
    /** P74: max title length enforced by the deterministic fallback (default 60). */
    titleMaxLength?: number;
    /** P74: max display summary length enforced by the deterministic fallback (default 160). */
    summaryMaxLength?: number;
    /** P74: optional model profile used for LLM title/summary generation. */
    titleProfile?: string;
}

export interface AgentContextOptions {
    /** Max estimated tokens for conversation history sent to model */
    maxHistoryTokens?: number;
    /** Max memory records included in context */
    maxMemoryRecords?: number;
    /** Max chars per tool result before truncation */
    maxToolResultChars?: number;
    /** Number of recent non-system messages kept verbatim when older history is compacted */
    compactionRecentMessages?: number;
    /** Minimum estimated history tokens required before context compaction runs */
    compactionMinTokens?: number;
    /**
     * Number of messages at which LLM-based context compaction is triggered.
     * When message count exceeds this threshold, old messages are compressed
     * into a summary instead of being dropped. Set to 0 or undefined to disable.
     * Must be greater than context.compactionRecentMessages to avoid compacting all recent context.
     */
    compactionThreshold?: number;
    /** Load cross-session experience patterns from MemoryStore during context assembly (default: false). */
    experienceMemory?: boolean;
}

export interface AgentToolOptions {
    /** Whether to execute independent tool calls in parallel */
    parallelExecution?: boolean;
    /** Max parallel tool calls */
    maxParallelTools?: number;
    /** Tool names that are safe to run in parallel (read-only tools) */
    parallelSafeTools?: string[];
    /** Tool names/patterns or category rules requiring approval before execution (A3 granular form). */
    requireApproval?: ApprovalRule[];
    /** Approval timeout in ms */
    approvalTimeoutMs?: number;
    /** A2: whether an injected ApprovalReviewer may resolve approval requests without a human. */
    approvalAutoReview?: boolean;
}

export interface AgentSchedulerOptions {
    enabled?: boolean;
    shutdownTimeoutMs?: number;
    defaultMaxAttempts?: number;
    defaultRetryBackoffMs?: number;
    defaultRetryBackoffMultiplier?: number;
}

export interface AgentUIOptions {
    title?: string;
    theme?: Record<string, any>;
    console?: Record<string, any>;
    keymap?: Record<string, string | null>;
    queueMode?: boolean | 'on' | 'off';
    /**
     * P128: when true, pressing Enter while a turn is running interrupts the
     * turn and immediately continues with the new instruction as a steer
     * message (marked `kind: 'steer'`). When false the running-turn Enter
     * falls back to queueMode. Default true.
     */
    steerMode?: boolean | 'on' | 'off';
    statusline?: string[];
    /**
     * P126: memory injection toggle. When false the runtime skips memory
     * retrieval during context preparation (default true).
     */
    memoryInjection?: boolean;
    /**
     * P126: active personality preset name (see AGENT_PERSONALITY_PRESETS).
     * The runtime injects the preset tone into the system prompt when set.
     */
    personality?: string;
    /**
     * P126: experimental feature switches (name -> enabled). Exposed through
     * the `/experimental` command; hosts read the resolved flags.
     */
    experimental?: Record<string, boolean>;
    /**
     * P139: whether the terminal window title is kept in sync with the
     * console state (default true). Set to false to disable OSC title
     * sequences (TUI) and document.title updates (browser).
     */
    terminalTitle?: boolean;
    /**
     * P131: whether the message area renders raw plain text instead of
     * markdown-reflowed lines (default false). Keeps long tool output
     * un-truncated and unstyled so it can be selected/copied from the
     * terminal. Toggled at runtime with `/raw` (persisted per workspace).
     */
    rawMode?: boolean;
    /**
     * P148: show a lightweight `/plan` suggestion when a sufficiently long
     * composer draft explicitly asks for planning or design before edits
     * (default true).
     */
    planNudges?: boolean;
}

export interface AgentBootstrapTurnOptions {
    enabled?: boolean;
    sessionId?: string;
    input?: string;
    output?: string;
}

export interface AgentSandboxOptions {
    /** OS-level sandbox mode for process-executing tools (default: 'off'). */
    mode?: import('./harness/sandbox-exec').SandboxMode;
    /**
     * A3: when `mode` is 'network-block', commands that reference one of these
     * hostnames / URL prefixes run without network blocking (approximating a
     * network destination allowlist).
     */
    networkAllowlist?: string[];
    /** Proxy enforcement for sandboxed child processes. */
    proxy?: {
        http?: string;
        https?: string;
        noProxy?: string[];
        /** Refuse outbound-enabled execution when no proxy URL is configured. */
        required?: boolean;
    };
}

/**
 * A7: best-effort source formatter applied to generated edits. When a write
 * tool (write_file / edit_file / apply_patch) lands a change whose file
 * extension matches `extensions`, the tool runs `command <file>` and ignores
 * failures (a broken formatter never blocks the write).
 */
export interface AgentGitStepSnapshotOptions {
    /** git command timeout in ms (default 10000). */
    timeoutMs?: number;
    /** remove untracked files created after the snapshot during revert (default true). */
    cleanUntracked?: boolean;
}

export interface AgentFormatterOptions {
    /** Formatter command invoked as `command <filePath>` (e.g. 'prettier', 'npx prettier --write'). */
    command: string;
    /** File extensions (with leading dot, e.g. '.ts', '.json') that trigger the formatter. */
    extensions: string[];
    /** Extra environment variables for the formatter process. */
    env?: Record<string, string>;
}

/**
 * P79: post-edit verification command options. After a tool round edits
 * files, the runtime runs package verification commands scoped to the edited
 * packages and records the results as `verify-command` evidence consumed by
 * the verification gate (check d).
 */
export interface AgentVerificationOptions {
    /** Master switch; set false to disable verification commands entirely (default true). */
    enabled?: boolean;
    /**
     * Explicit command templates keyed by kind, run verbatim when set
     * (e.g. `{ typecheck: 'tsc --noEmit', test: 'vitest run --changed' }`).
     */
    verifyCommands?: Partial<Record<'test' | 'build' | 'typecheck' | 'lint' | string, string>>;
    /**
     * Auto-discovered package.json script names run when present in the edited
     * package (default ['typecheck', 'lint']; long-running suites like test /
     * build are opt-in to avoid slowing every edit round).
     */
    autoScripts?: string[];
    /** Per-command timeout in ms (default 120000). */
    timeoutMs?: number;
    /** Max output chars captured per command (default 8000). */
    maxOutputChars?: number;
}

/**
 * P195: token budget for skill content injected into the system prompt.
 * When the combined character count of active skills exceeds `maxChars`,
 * skills are compacted to their summary (oldest-activated first) and
 * the catalog section is truncated to keep total skill content within budget.
 */
export interface AgentSkillTokenBudgetOptions {
    /**
     * Maximum characters allowed for all skill content combined in the
     * system prompt (active skills + catalog). Undefined = unlimited.
     * Tokens are approximated at ~4 chars per token.
     */
    maxChars?: number;
    /**
     * When over budget, compact active skills to summary only (drop promptFull)
     * starting from the least-recently activated skill. Default true.
     */
    compactActive?: boolean;
    /**
     * When over budget after compaction, truncate the catalog listing.
     * Default true.
     */
    truncateCatalog?: boolean;
}

/**
 * P98: rollout token budget (G25). Tracks cumulative token consumption across
 * agent threads/sessions and enforces a per-scope cap: when remaining budget
 * crosses the reminder thresholds the runtime publishes
 * `AgentTokenBudgetReminderEvent`; when the budget is exhausted it aborts the
 * current turn and publishes `AgentTokenBudgetExceededEvent`.
 */
export interface AgentTokenBudgetOptions {
    /** Per-session cumulative token cap (undefined = unlimited). */
    perSession?: number;
    /** Per-thread cumulative token cap (undefined = unlimited). */
    perThread?: number;
    /**
     * Reminder thresholds as fractions of the budget remaining that publish
     * reminder events (default [0.2, 0.1] → 20% / 10%).
     */
    reminders?: number[];
    /**
     * When true the budget is enforced with per-scope tracked usage that does
     * NOT depend on persisted usage records (in-memory accumulator). Default
     * false (derive from persisted session messages).
     */
    trackInMemory?: boolean;
}

export interface AgentOptions {
    /** v19 policy limits; optional overlays preserve existing defaults. */
    policy?: AgentPolicyConfig;
    name?: string;
    maxToolRounds?: number;
    /** B2: max consecutive falsified rounds before a turn terminates with a failure summary (default 2). */
    maxRepairRounds?: number;
    /** A4: max loop-recovery prompt injections before a looping turn terminates (default 3). */
    maxLoopRecoveries?: number;
    /** B2: tool names treated as write operations for the declared-vs-actual diff check. */
    verificationWriteTools?: string[];
    /** B4: reference to a versioned harness governance snapshot (built-in name or inline profile). */
    harnessProfile?: string | HarnessProfile;
    /** P79: post-edit verification commands (typecheck/lint/build/test) as gate evidence. */
    verification?: AgentVerificationOptions;
    session?: AgentSessionOptions;
    context?: AgentContextOptions;
    tools?: AgentToolOptions;
    scheduler?: AgentSchedulerOptions;
    ui?: AgentUIOptions;
    model?: AgentModelOptions;
    bootstrapTurn?: AgentBootstrapTurnOptions;
    sandbox?: AgentSandboxOptions;
    /** A7: best-effort source formatter for generated edits (write tools only). */
    format?: AgentFormatterOptions;
    /** P70: named session archetypes; custom entries override built-ins by name. */
    archetypes?: Record<string, AgentArchetype>;
    /** P70: archetype used when a session has no explicit override (default 'build'). */
    defaultArchetype?: string;
    /** P71: git-backed step snapshots with message-level revert/unrevert. */
    gitStepSnapshots?: AgentGitStepSnapshotOptions;
    /** P72: filenames tried per directory when the primary project doc is missing (e.g. ['CLAUDE.md']). */
    projectDocFallbackFilenames?: string[];
    /** P72: per-file byte cap for project docs (default 32KiB). */
    projectDocMaxBytes?: number;
    /** P106: extra project docs contributed by installed agent plugins (e.g. plugin-scoped AGENTS.md). */
    pluginAgentsDocs?: Array<{ path: string; label?: string }>;
    /** G31: directory holding `trusted-projects.json` (default `~/.tsdi-agent`). */
    trustedProjectsRoot?: string;
    hooks?: AgentHooksOptions;
    /** P98: rollout token budget enforcement (G25). */
    tokenBudget?: AgentTokenBudgetOptions;
    /** P195: skill content token budget for system prompt injection (default unlimited). */
    skillTokenBudget?: AgentSkillTokenBudgetOptions;
    /** G29: per-session delegation mode (default 'explicit'). Per-turn overrides via AgentTurnInput.agent.delegationMode. */
    delegationMode?: AgentDelegationMode;
}

export interface AgentPolicyLimits {
    commandOutputHistoryCap?: number;
    commandOutputPageSize?: number;
    timelinePageSize?: number;
    backgroundTaskPageSize?: number;
    approvalTimeoutMs?: number;
    approvalMaxPending?: number;
    rpcTimeoutMs?: number;
}

export type AgentPolicySource = 'default' | 'workspace' | 'session' | 'request';

export interface AgentPolicyConfig {
    limits?: AgentPolicyLimits;
    /** P70: schema default session archetype used when a session has no explicit override (falls back to `AgentOptions.defaultArchetype`, then `'build'`). */
    defaultArchetype?: string;
    /** G29: schema default session delegation mode used when a session has no explicit override (falls back to `AgentOptions.delegationMode`, then `'explicit'`). */
    delegationMode?: AgentDelegationMode;
    source?: AgentPolicySource;
}

/** P70/G29: a resolved policy value plus the policy layer that supplied it. */
export interface AgentPolicyResolution<T> {
    value: T;
    source: AgentPolicySource;
}

export function resolveAgentPolicy(...overrides: Array<AgentPolicyConfig | undefined>): AgentPolicyConfig {
    const limits = overrides.reduce<AgentPolicyLimits>((merged, item) => ({ ...merged, ...(item?.limits ?? {}) }), {});
    const defaultArchetype = overrides.map(item => item?.defaultArchetype).filter(Boolean).pop();
    const delegationMode = overrides.map(item => item?.delegationMode).filter(Boolean).pop();
    const source = overrides.map(item => item?.source).filter(Boolean).pop() as AgentPolicySource | undefined;
    return {
        limits,
        ...(defaultArchetype ? { defaultArchetype } : {}),
        ...(delegationMode ? { delegationMode } : {}),
        ...(source ? { source } : {})
    };
}

/** A4: default deepseek connection settings reference the provider registry (single source of truth). */
const DEFAULT_DEEPSEEK_PROVIDER = BUILTIN_AGENT_PROVIDERS.find(provider => provider.id === 'deepseek');

export const defaultAgentOptions: AgentOptions = {
    policy: { source: 'default', limits: { commandOutputHistoryCap: 500, commandOutputPageSize: 20, timelinePageSize: 100, backgroundTaskPageSize: 50, approvalTimeoutMs: 30000, approvalMaxPending: 100, rpcTimeoutMs: 300000 } },
    name: 'HermesAgent',
    // Generation tasks commonly need discovery, planning, several edits, and
    // verification. Four rounds stops them before the first usable artifact.
    maxToolRounds: 12,
    maxRepairRounds: 2,
    maxLoopRecoveries: 3,
    session: {
        summaryThreshold: 8,
        recentMessages: 6,
        autoTitle: true,
        autoSummary: true,
        titleMaxLength: 60,
        summaryMaxLength: 160
    },
    context: {
        maxHistoryTokens: 32000,
        maxMemoryRecords: 50,
        maxToolResultChars: 8000,
        compactionRecentMessages: 6,
        compactionMinTokens: 1200,
        compactionThreshold: 20
    },
    tools: {
        parallelExecution: false,
        maxParallelTools: 5,
        parallelSafeTools: ['memory.search', 'time', 'echo', 'web_search', 'session_search'],
        requireApproval: ['shell.exec', 'fs.write', 'fs.delete', 'sudo.exec', 'deploy', 'playwright_browser'],
        approvalTimeoutMs: 30000
    },
    scheduler: {
        enabled: true,
        shutdownTimeoutMs: 10000,
        defaultMaxAttempts: 3,
        defaultRetryBackoffMs: 1000,
        defaultRetryBackoffMultiplier: 2
    },
    ui: {
        title: 'tsdi-agent'
    },
    model: {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        baseUrl: DEFAULT_DEEPSEEK_PROVIDER?.baseUrl,
        apiKeyEnv: DEFAULT_DEEPSEEK_PROVIDER?.apiKeyEnv,
        timeoutMs: 120000
    },
    bootstrapTurn: {
        enabled: false,
        sessionId: 'default',
        input: '',
        output: ''
    },
    defaultArchetype: DEFAULT_ARCHETYPE,
    delegationMode: DEFAULT_DELEGATION_MODE,
    projectDocFallbackFilenames: ['AGENTS.md'],
    projectDocMaxBytes: 32768,
    trustedProjectsRoot: '',
    verification: {
        enabled: true,
        autoScripts: ['typecheck', 'lint'],
        timeoutMs: 120000,
        maxOutputChars: 8000
    }
};

export function mergeAgentOptions(options?: AgentOptions): AgentOptions {
    const profile = options?.harnessProfile ? resolveHarnessProfile(options.harnessProfile) : undefined;
    const overlay = profile ? applyHarnessProfile(profile) : {};
    const profileTools = overlay.tools ?? {};
    const profileSandbox = overlay.sandbox ?? {};
    return {
        ...defaultAgentOptions,
        ...overlay,
        ...(options ?? {}),
        session: {
            ...defaultAgentOptions.session,
            ...(options?.session ?? {})
        },
        context: {
            ...defaultAgentOptions.context,
            ...(options?.context ?? {})
        },
        tools: {
            ...defaultAgentOptions.tools,
            ...profileTools,
            ...(options?.tools ?? {})
        },
        scheduler: {
            ...defaultAgentOptions.scheduler,
            ...(options?.scheduler ?? {})
        },
        ui: {
            ...defaultAgentOptions.ui,
            ...(options?.ui ?? {}),
            console: {
                ...defaultAgentOptions.ui?.console,
                ...(options?.ui?.console ?? {})
            }
        },
        model: {
            ...defaultAgentOptions.model,
            ...(options?.model ?? {})
        },
        bootstrapTurn: {
            ...defaultAgentOptions.bootstrapTurn,
            ...(options?.bootstrapTurn ?? {})
        },
        sandbox: {
            ...defaultAgentOptions.sandbox,
            ...profileSandbox,
            ...(options?.sandbox ?? {})
        },
        archetypes: {
            ...(defaultAgentOptions.archetypes ?? {}),
            ...(options?.archetypes ?? {})
        },
        hooks: {
            ...(defaultAgentOptions.hooks ?? {}),
            ...(options?.hooks ?? {})
        },
        verification: {
            ...(defaultAgentOptions.verification ?? {}),
            ...(options?.verification ?? {})
        }
    };
}
