import { TodoItem, TodoItemKind } from './todo-store';

/**
 * Evidence-aware plan compiler (P226).
 *
 * Lifts the plan from "a model-suggested checklist" to an auditable,
 * evidence-backed execution contract. Each step is enriched with:
 *   - `acceptance`: how to verify the step is done (existing field, enforced)
 *   - `dependsOn`: ordering constraint (existing field, enforced)
 *   - `evidence`: the expected evidence kind that proves completion
 *   - `risk`: a coarse risk level to guide review/approval
 *
 * Vague or multi-action items are deterministically split into atomic
 * proposal steps (`proposed: true`) that the model must confirm before they
 * become part of the accepted plan. Single-action, low-risk items are auto
 * normalized in place and carry `proposed: false`.
 */

export type PlanEvidenceType = 'test' | 'diff' | 'diagnostic' | 'review';
export type PlanRiskLevel = 'low' | 'medium' | 'high';

/** A compiled step. Extends TodoItem and adds evidence-aware enrichment. */
export interface DecomposedStep extends TodoItem {
    /** Expected evidence kind that proves this step is done. */
    evidence?: PlanEvidenceType;
    /** Coarse risk level guiding review/approval. */
    risk?: PlanRiskLevel;
    /**
     * True when this step is a machine-generated proposal that must be
     * confirmed (explicitly accepted) before execution. False for steps that
     * were already atomic and only auto-normalized in place.
     */
    proposed?: boolean;
    /**
     * Id of the source (vague / multi-action) item this step was split from.
     * Absent when the step came from the model verbatim.
     */
    sourceItemId?: string;
}

/**
 * Result of compiling a plan. `steps` is the accepted/normalized set, and
 * `proposals` lists the machine-split steps that still need model confirmation.
 */
export interface PlanCompileResult {
    /** All compiled steps (auto-normalized + split proposals, flattened). */
    steps: DecomposedStep[];
    /** Subset of `steps` that require explicit model confirmation. */
    proposals: DecomposedStep[];
    /** Steps that were accepted/auto-normalized without further confirmation. */
    accepted: DecomposedStep[];
    /** Items that failed to compile (unactionable) with a reason. */
    rejected: { itemId: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// Evidence inference
// ---------------------------------------------------------------------------

/**
 * Keyword → evidence kind mapping. Used to infer the expected proof for a
 * step from its content. Order matters: `test` is checked before others so
 * "write a test and run the build" is classified as test-driven.
 */
const EVIDENCE_KEYWORDS: Array<[PlanEvidenceType, RegExp]> = [
    ['test', /\b(test|spec|expect|assert|coverage|pytest|jest|vitest|unit test|integration test|e2e test)\b/i],
    ['diagnostic', /\b(lint|linter|analy|diagnostic|type-check|typecheck|tsc|compile|build|static analysis)\b/i],
    ['review', /\b(review|approve|audit|plan|design|proposal|criteria|verify plan)\b/i],
    ['diff', /\b(diff|patch|change file|edit|refactor|migrat|implement|write|add|fix|remove|delete|rename)\b/i]
];

/** Coarse risk keywords. High-risk steps are those touching data, security, or shared state. */
const HIGH_RISK_KEYWORDS = /\b(delete|drop|remove|reset|purge|wipe|secret|credential|password|token|key|permission|auth|migrat|rollback|production|prod|payment|billing|db|database|schema)\b/i;
const MEDIUM_RISK_KEYWORDS = /\b(refactor|rename|move|migrat|rewrite|restructure|interface|api|public|broadcast|deploy|release|merge)\b/i;

/**
 * Default conjunction words that mark a step as bundling multiple actions.
 * Kept as data (not a baked regex) so callers can override the set via
 * `splitAtomicFragments`/`compilePlan`, mirroring how the harness drives
 * continuation from todo status rather than a fixed splitting rule.
 */
export const DEFAULT_CONJUNCTIONS: string[] = [
    'and then', 'also add', 'as well as',
    '同时', '另外', '并且', '然后再', '并且然后', '以及', '和', '、'
];

/**
 * True when the token is a non-decomposable boundary: either multi-byte
 * (e.g. CJK) or not made of word characters (e.g. punctuation like `;`),
 * where `\b` must not be applied.
 */
function isNonWordBoundaryToken(token: string): boolean {
    return /[^\x00-\x7f]/.test(token) || !/^[\w]+$/.test(token);
}

/** Escape a token so it is treated literally inside a character-class-free alternation. */
function escapeToken(token: string): string {
    return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build the conjunction split regex from a token list (non-capturing alternatives). */
export function buildMultiActionPattern(conjunctions: string[] = DEFAULT_CONJUNCTIONS): RegExp {
    const alternatives = conjunctions.map(token => {
        const escaped = escapeToken(String(token));
        return isNonWordBoundaryToken(escaped) ? `(?:${escaped})` : `\\b(?:${escaped})\\b`;
    });
    return new RegExp(alternatives.join('|'), 'i');
}

const VAGUE_PATTERNS = /\b(something|stuff|etc|etc\.|fix issues|handle things|improve it|make it work|finish up|wrap up)\b/i;

/**
 * Infer the expected evidence kind for a step from its content. Defaults to
 * `'diff'` for change-oriented steps and `'test'` when no keyword matches and
 * the content mentions verification.
 */
export function inferEvidenceType(content: string): PlanEvidenceType {
    const text = String(content ?? '').trim();
    for (const [evidence, re] of EVIDENCE_KEYWORDS) {
        if (re.test(text)) {
            return evidence;
        }
    }
    return 'diff';
}

/**
 * Infer a coarse risk level for a step from its content. High-risk keywords win;
 * otherwise medium-risk keywords, otherwise low.
 */
export function inferRiskLevel(content: string): PlanRiskLevel {
    const text = String(content ?? '').trim();
    if (HIGH_RISK_KEYWORDS.test(text)) {
        return 'high';
    }
    if (MEDIUM_RISK_KEYWORDS.test(text)) {
        return 'medium';
    }
    return 'low';
}

// ---------------------------------------------------------------------------
// Deterministic splitting
// ---------------------------------------------------------------------------

/**
 * Split a multi-action / vague content string into concrete atomic fragments.
 * Splits on Chinese/English conjunction markers and trailing punctuation,
 * dropping empty fragments. Returns a single-element array when the content
 * is already atomic.
 */
export function splitAtomicFragments(content: string, conjunctions: string[] = DEFAULT_CONJUNCTIONS): string[] {
    const text = String(content ?? '').trim();
    if (!text) {
        return [];
    }
    const pattern = buildMultiActionPattern(conjunctions);
    const parts = text
        .split(pattern)
        .map(part => part.trim())
        .filter(part => part.length > 0);
    return parts.length > 0 ? parts : [text];
}

/**
 * Auto-normalize a single atomic step: fill in missing acceptance, evidence,
 * and risk from content. Returns a `DecomposedStep` carrying `proposed: false`.
 */
export function autoNormalizeStep(item: TodoItem): DecomposedStep {
    const content = String(item.content ?? '').trim();
    const normalized: DecomposedStep = { ...item, content };
    normalized.evidence = normalized.evidence ?? inferEvidenceType(content);
    normalized.risk = normalized.risk ?? inferRiskLevel(content);
    normalized.proposed = false;
    normalized.acceptance = normalized.acceptance
        ?? defaultAcceptanceFor(content, normalized.evidence);
    return normalized;
}

/** Derive a default acceptance criterion from a step's content + evidence kind. */
export function defaultAcceptanceFor(content: string, evidence: PlanEvidenceType): string {
    const text = String(content ?? '').trim();
    const verb = text.split(/\s+/).slice(0, 4).join(' ') || 'the change';
    switch (evidence) {
        case 'test':
            return `Add/update tests that verify "${truncatePhrase(text)}" and they pass.`;
        case 'diagnostic':
            return `Run the available static checker(s); no new errors reported for "${truncatePhrase(text)}".`;
        case 'review':
            return `A review/approval confirms "${truncatePhrase(text)}" meets the stated criteria.`;
        case 'diff':
        default:
            return `The change for "${truncatePhrase(text)}" is implemented and appears in the diff.`;
    }
}

function truncatePhrase(text: string): string {
    const trimmed = String(text ?? '').trim();
    return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

/**
 * The evidence-aware plan compiler.
 *
 * For each input item:
 *   - If it is atomic (single action) → auto-normalize in place (accepted).
 *   - If it is multi-action or vague → split into atomic proposal steps
 *     (`proposed: true`) that the model must confirm; keep the source kind and
 *     record `sourceItemId`.
 *   - If it cannot be turned into actionable steps → reject with a reason.
 *
 * `acceptAll` (auto-accept) compacts every proposal into the accepted set,
 * which is useful for hosts that let the model confirm once in bulk.
 */
export function compilePlan(
    todos: TodoItem[],
    options?: { acceptAll?: boolean; conjunctions?: string[] }
): PlanCompileResult {
    const steps: DecomposedStep[] = [];
    const proposals: DecomposedStep[] = [];
    const accepted: DecomposedStep[] = [];
    const rejected: { itemId: string; reason: string }[] = [];

    for (const raw of todos ?? []) {
        const item = raw as TodoItem;
        const itemId = item?.id ?? '?';
        const content = String(item?.content ?? '').trim();
        const baseKind = item?.kind;

        if (!content || content === '(no description)') {
            rejected.push({ itemId, reason: 'Empty or placeholder content — cannot compile into an actionable step.' });
            continue;
        }

        const fragments = splitAtomicFragments(content, options?.conjunctions);
        const isMultiAction = fragments.length > 1 || VAGUE_PATTERNS.test(content);

        if (!isMultiAction) {
            const normalized = autoNormalizeStep({
                id: itemId,
                content,
                status: item.status,
                ...(baseKind && { kind: baseKind }),
                ...(item.acceptance && { acceptance: item.acceptance }),
                ...(item.dependsOn && { dependsOn: item.dependsOn }),
                ...(item.estimate && { estimate: item.estimate }),
                ...(item.owner && { owner: item.owner }),
                ...(item.parentId && { parentId: item.parentId })
            });
            steps.push(normalized);
            accepted.push(normalized);
            continue;
        }

        // Multi-action / vague → split into proposals the model must confirm.
        fragments.forEach((fragment, index) => {
            const proposal: DecomposedStep = autoNormalizeStep({
                id: `${itemId}#${index + 1}`,
                content: fragment,
                status: 'pending',
                ...(baseKind && { kind: baseKind }),
                ...(item.dependsOn && { dependsOn: item.dependsOn }),
                ...(item.estimate && { estimate: item.estimate }),
                ...(item.owner && { owner: item.owner }),
                ...(item.parentId && { parentId: item.parentId })
            });
            proposal.sourceItemId = itemId;
            proposal.proposed = true;
            steps.push(proposal);
            proposals.push(proposal);
        });
    }

    if (options?.acceptAll) {
        for (const step of accepted.concat(proposals)) {
            if (!accepted.includes(step)) {
                accepted.push(step);
            }
        }
    }

    return { steps, proposals, accepted, rejected };
}

// Re-export the kind type for callers that need to preserve classification.
export type { TodoItemKind };
