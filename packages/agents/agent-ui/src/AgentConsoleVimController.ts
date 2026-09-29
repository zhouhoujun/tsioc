import type { ConsoleInputMode } from './AgentConsoleVim';
import { isConsoleVimAction, resolveConsoleVimKey, VIM_DEFAULT_BINDINGS } from './AgentConsoleVim';

export interface AgentConsoleVimStatePort {
    vimMode: boolean;
    inputMode: ConsoleInputMode;
    vimPendingKey: string;
    vimBindings: Record<string, string>;
    input: string;
    inputCursor: number;
    setInput(value: string, cursor?: number): void;
    setInputCursor(cursor: number): void;
    moveInputCursor(delta: number): void;
    moveInputCursorToEdge(position: 'start' | 'end'): void;
    setInputMode(mode: ConsoleInputMode): void;
    inputHistoryController: { navigate(delta: number): boolean };
}

export abstract class AgentConsoleVimController {
    constructor(protected readonly state: AgentConsoleVimStatePort) {}

    handleKey(key: string): boolean {
        if (!this.state.vimMode || this.state.inputMode !== 'normal') return false;
        const resolution = resolveConsoleVimKey(key, this.bindings(), this.state.vimPendingKey || undefined);
        if (resolution.pending !== undefined) {
            this.state.vimPendingKey = resolution.pending;
            return true;
        }
        this.state.vimPendingKey = '';
        return resolution.action ? this.applyAction(resolution.action) : false;
    }

    applyAction(action: string): boolean {
        switch (action) {
            case 'insert-mode': this.state.setInputMode('insert'); break;
            case 'insert-start': this.state.moveInputCursorToEdge('start'); this.state.setInputMode('insert'); break;
            case 'insert-after': this.state.setInputCursor(this.state.inputCursor + 1); this.state.setInputMode('insert'); break;
            case 'insert-end': this.state.moveInputCursorToEdge('end'); this.state.setInputMode('insert'); break;
            case 'newline-below': this.state.setInput(this.state.input ? `${this.state.input}\n` : '', this.state.input.length + 1); this.state.setInputMode('insert'); break;
            case 'newline-above': this.state.setInput(this.state.input ? `\n${this.state.input}` : '', 0); this.state.setInputMode('insert'); break;
            case 'history-prev': return this.state.inputHistoryController.navigate(-1);
            case 'history-next': return this.state.inputHistoryController.navigate(1);
            case 'cursor-left': this.state.moveInputCursor(-1); break;
            case 'cursor-right': this.state.moveInputCursor(1); break;
            case 'cursor-start': this.state.moveInputCursorToEdge('start'); break;
            case 'cursor-end': this.state.moveInputCursorToEdge('end'); break;
            case 'delete-char':
                if (this.state.inputCursor < this.state.input.length) this.state.setInput(this.state.input.slice(0, this.state.inputCursor) + this.state.input.slice(this.state.inputCursor + 1), this.state.inputCursor);
                break;
            case 'delete-line': this.state.setInput('', 0); break;
            case 'exit-insert': this.state.setInputMode('normal'); break;
            default: return false;
        }
        return true;
    }

    bindings(): Record<string, string> { return { ...VIM_DEFAULT_BINDINGS, ...this.state.vimBindings }; }
    setBinding(key: string, action: string): boolean { const k = String(key || '').trim(); if (!k || !isConsoleVimAction(action)) return false; this.state.vimBindings = { ...this.state.vimBindings, [k]: action }; return true; }
    unsetBinding(key: string): boolean { const k = String(key || '').trim(); if (!k || !this.state.vimBindings[k]) return false; const next = { ...this.state.vimBindings }; delete next[k]; this.state.vimBindings = next; return true; }
    resetBindings(): void { this.state.vimBindings = {}; this.state.vimPendingKey = ''; }
}

export class DefaultAgentConsoleVimController extends AgentConsoleVimController {}

export function createAgentConsoleVimController(state: AgentConsoleVimStatePort): AgentConsoleVimController {
    return new DefaultAgentConsoleVimController(state);
}
