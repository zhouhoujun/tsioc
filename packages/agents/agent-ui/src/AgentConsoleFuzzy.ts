/**
 * Fuzzy matching for blocking menu filters (opencode-style palette search).
 *
 * The filter box in a select dialog is a search field, not a substring test:
 * `drk` must find `dark` and `sessions` rows must match on title words. The
 * scorer keeps a deterministic ordering so repeated keystrokes never reshuffle
 * equal matches, and it stays a pure function so it can be cached/tested on
 * its own.
 */

/** Separators that start a new word for the "word start" bonus. */
const WORD_BOUNDARY = /[\s\-_/.:·|,()[\]{}]+/;

function isWordStart(text: string, index: number): boolean {
    if (index === 0) {
        return true;
    }
    return WORD_BOUNDARY.test(text[index - 1]);
}

/**
 * Score one haystack against a query. Lower is better, `undefined` means the
 * query is not present in the haystack.
 *
 * Tiers (kept far apart so any tier-A match beats any tier-B match):
 *   0    exact
 *   100  prefix
 *   200  word-start substring
 *   300  mid-word substring
 *   400  subsequence fallback
 */
export function scoreAgentConsoleFuzzyMatch(haystack: string, needle: string): number | undefined {
    const text = String(haystack || '').toLowerCase();
    const query = String(needle || '').trim().toLowerCase();
    if (!query) {
        return 0;
    }
    if (!text) {
        return undefined;
    }
    if (text === query) {
        return 0;
    }
    const lengthCost = text.length - query.length;
    const index = text.indexOf(query);
    if (index === 0) {
        return 100 + lengthCost;
    }
    if (index > 0) {
        const base = isWordStart(text, index) ? 200 : 300;
        return base + index + lengthCost;
    }
    // Subsequence: every query character appears in order. Penalize gaps and
    // characters that do not start a word, so `drk` prefers `dark` over
    // `docker ... r k`.
    let cursor = 0;
    let previous = -1;
    let gaps = 0;
    let wordMisses = 0;
    for (let i = 0; i < text.length && cursor < query.length; i += 1) {
        if (text[i] !== query[cursor]) {
            continue;
        }
        if (previous >= 0) {
            gaps += i - previous - 1;
        }
        if (!isWordStart(text, i)) {
            wordMisses += 1;
        }
        previous = i;
        cursor += 1;
    }
    if (cursor < query.length) {
        return undefined;
    }
    return 400 + gaps * 2 + lengthCost + wordMisses * 4;
}

export interface AgentConsoleFuzzyOption {
    label?: string;
    value?: string;
    description?: string;
}

/** Best score across label/value/description, with a penalty for weaker fields. */
export function scoreAgentConsoleFuzzyOption(option: AgentConsoleFuzzyOption, needle: string): number | undefined {
    let best: number | undefined;
    const consider = (value: unknown, penalty: number): void => {
        const score = scoreAgentConsoleFuzzyMatch(String(value ?? ''), needle);
        if (score === undefined) {
            return;
        }
        const adjusted = score + penalty;
        if (best === undefined || adjusted < best) {
            best = adjusted;
        }
    };
    consider(option.label, 0);
    consider(option.value, 20);
    consider(option.description, 60);
    return best;
}

/**
 * Filter and rank menu options by a live filter. Equal scores keep their
 * original order so the highlight does not jump between equivalent rows.
 */
export function rankAgentConsoleFuzzyOptions<T extends AgentConsoleFuzzyOption>(options: T[], filter: string): T[] {
    const query = String(filter || '').trim();
    if (!query) {
        return options.slice();
    }
    const ranked: Array<{ option: T; score: number; index: number }> = [];
    options.forEach((option, index) => {
        const score = scoreAgentConsoleFuzzyOption(option, query);
        if (score !== undefined) {
            ranked.push({ option, score, index });
        }
    });
    ranked.sort((left, right) => left.score - right.score || left.index - right.index);
    return ranked.map(entry => entry.option);
}
