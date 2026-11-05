import { shouldSkipCommonHistoryEntry } from './input';

export interface CommonInputHistoryStatePort {
    input: string;
    inputHistoryEntries: string[];
    inputHistoryIndex: number;
    inputHistoryDraft: string;
    setInput(value: string, cursor?: number): void;
}

export const COMMON_INPUT_HISTORY_LIMIT = 200;

/**
 * Renderer-neutral prompt history navigation (up/down), shared by TUI and DOM
 * composers. Workspace persistence remains host-owned.
 */
export abstract class CommonInputHistoryController {
    constructor(
        protected readonly state: CommonInputHistoryStatePort,
        protected readonly limit = COMMON_INPUT_HISTORY_LIMIT
    ) {}

    push(value: string): void {
        const trimmed = String(value || '').trim();
        if (!trimmed || this.shouldSkip(trimmed)) return;
        this.state.inputHistoryEntries = [trimmed, ...this.state.inputHistoryEntries.filter(item => item !== trimmed)]
            .slice(0, this.limit);
        this.resetNavigation();
    }

    replace(entries: string[]): void {
        this.state.inputHistoryEntries = Array.from(new Set((entries || [])
            .map(entry => String(entry || '').trim())
            .filter(entry => !!entry && !this.shouldSkip(entry))))
            .slice(0, this.limit);
        this.resetNavigation();
    }

    entries(): string[] {
        return this.state.inputHistoryEntries.slice();
    }

    navigate(delta: number): boolean {
        if (!this.state.inputHistoryEntries.length) return false;
        if (this.state.inputHistoryIndex === -1 && this.state.input.includes('\n')) return false;
        if (delta < 0) {
            if (this.state.inputHistoryIndex === -1) this.state.inputHistoryDraft = this.state.input;
            const next = Math.min(this.state.inputHistoryEntries.length - 1, this.state.inputHistoryIndex + 1);
            if (next < 0 || next === this.state.inputHistoryIndex) return false;
            this.state.inputHistoryIndex = next;
        } else {
            if (this.state.inputHistoryIndex === -1) return false;
            const next = this.state.inputHistoryIndex - 1;
            if (next < 0) {
                this.state.inputHistoryIndex = -1;
                this.state.setInput(this.state.inputHistoryDraft, this.state.inputHistoryDraft.length);
                return true;
            }
            this.state.inputHistoryIndex = next;
        }
        const value = this.state.inputHistoryEntries[this.state.inputHistoryIndex] || '';
        this.state.setInput(value, value.length);
        return true;
    }

    resetNavigation(): void {
        this.state.inputHistoryIndex = -1;
        this.state.inputHistoryDraft = '';
    }

    shouldSkip(entry: string): boolean {
        return shouldSkipCommonHistoryEntry(entry);
    }
}

export class DefaultCommonInputHistoryController extends CommonInputHistoryController {}
