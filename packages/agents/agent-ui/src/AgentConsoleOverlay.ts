import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';

/**
 * P266: unified overlay option model and pure keyboard controller for the
 * select-menu family (command palette, suggestions). This is cross-platform —
 * it holds no reactive state and touches no node/console APIs, so both the
 * TUI and browser renderers share it.
 */

export type AgentConsoleOverlayKeyDecision =
    | { action: 'move'; delta: number }
    | { action: 'confirm' }
    | { action: 'accept' }
    | { action: 'choose'; index: number }
    | { action: 'digit-consume' }
    | { action: 'escape' }
    | { action: 'cancel' }
    | { action: 'none' };

export class AgentConsoleOverlayController {
    clampIndex(index: number, optionCount: number): number {
        if (optionCount <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(optionCount - 1, index));
    }

    moveIndex(current: number, delta: number, optionCount: number): number {
        if (optionCount <= 0) {
            return 0;
        }
        return (current + delta + optionCount) % optionCount;
    }

    isDismissKey(key: string): boolean {
        const normalized = String(key || '').trim().toLowerCase();
        return normalized === 'esc' || normalized === 'escape' || normalized === 'q';
    }

    isDigitKey(key: string): boolean {
        return /^[1-9]$/.test(String(key || '').trim().toLowerCase());
    }

    resolveDigitIndex(key: string, optionCount: number): number {
        const normalized = String(key || '').trim().toLowerCase();
        if (!/^[1-9]$/.test(normalized)) {
            return -1;
        }
        const index = parseInt(normalized, 10) - 1;
        return index < optionCount ? index : -1;
    }

    isSelectOptionDisabled(option: AgentConsoleSelectOption | undefined): boolean {
        return !!option && !!String(option.disabledReason || '').trim();
    }

    existsEnabledOption(options: AgentConsoleSelectOption[], fromIndex: number, direction: 1 | -1): boolean {
        if (!options.length) {
            return false;
        }
        const count = options.length;
        for (let step = 1; step <= count; step++) {
            const index = (fromIndex + direction * step + count) % count;
            if (!this.isSelectOptionDisabled(options[index])) {
                return true;
            }
        }
        return false;
    }

    resolveKey(key: string, optionCount: number): AgentConsoleOverlayKeyDecision {
        const normalized = String(key || '').trim().toLowerCase();
        switch (normalized) {
            case 'arrowup':
            case 'up':
                return { action: 'move', delta: -1 };
            case 'arrowdown':
            case 'down':
                return { action: 'move', delta: 1 };
            case 'enter':
            case 'tab':
            case 'return':
                return { action: 'confirm' };
            default:
                if (this.isDismissKey(normalized)) {
                    return { action: 'escape' };
                }
                const digit = this.resolveDigitIndex(normalized, optionCount);
                if (digit >= 0) {
                    return { action: 'choose', index: digit };
                }
                return { action: 'none' };
        }
    }

    resolveMenuKey(key: string, text: string, optionCount: number): AgentConsoleOverlayKeyDecision {
        const keyName = String(key || text || '');
        if (keyName === 'down') {
            return { action: 'move', delta: 1 };
        }
        if (keyName === 'up') {
            return { action: 'move', delta: -1 };
        }
        if (keyName === 'return' || keyName === 'tab') {
            return { action: 'accept' };
        }
        if (keyName === 'left' || keyName === 'right') {
            return { action: 'cancel' };
        }
        if (this.isDismissKey(keyName)) {
            return { action: 'escape' };
        }
        if (this.isDigitKey(keyName)) {
            const digit = this.resolveDigitIndex(keyName, optionCount);
            return digit >= 0 ? { action: 'choose', index: digit } : { action: 'digit-consume' };
        }
        return { action: 'none' };
    }
}
