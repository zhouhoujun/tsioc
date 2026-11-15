import { dismissBackgroundPanels } from './AgentConsoleDialogExclusivity';
import type { AgentConsoleSelectMenu, AgentConsoleSelectOption, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { getAgentConsoleCommandDefinition } from './AgentConsoleCommandRegistry';
import { applyAgentConsoleSuggestion, getAgentConsoleArgumentRange, getAgentConsoleInputTokenRange, getAgentConsoleMentionCandidates, isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';

export function selectAsync(state: AgentConsoleSessionState, title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string, kind?: string): Promise<string | undefined> {
        return new Promise(resolve => {
            state.openSelectMenu(title, options, selectedIndex, hint, kind);
            state.selectMenuAction = async (value: string | undefined) => {
                state.closeSelectMenu();
                resolve(value);
            };
        });
    }

export function openSelectMenu(state: AgentConsoleSessionState, title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string, kind?: string): void {
        dismissBackgroundPanels(state);
        const currentMenu = state.selectMenu;
        const currentAction = state.selectMenuAction;

        state.selectMenu = {
            title,
            kind,
            hint: hint || state.consoleOptions.selectHint,
            options: options.slice(),
            allOptions: options.slice(),
            filter: '',
            selectedIndex: Math.max(0, Math.min(Math.max(options.length - 1, 0), selectedIndex)),
            parentMenu: currentMenu,
            parentMenuAction: currentAction
        };
        state.syncDerivedInputFocus();
    }

export function closeSelectMenu(state: AgentConsoleSessionState): void {
        state.selectMenu = undefined;
        state.selectMenuTouched = false;
        state.syncDerivedInputFocus();
    }

export async function dismissSelectMenuLayer(state: AgentConsoleSessionState): Promise<void> {
        const currentMenu = state.selectMenu;
        const parentMenu = currentMenu?.parentMenu;
        if (!currentMenu) return;
        // Each palette keystroke reopens the menu, so its parent chain is the
        // query history, not a nested dialog. Esc closes it in one press.
        if (currentMenu.kind === 'palette') {
            await state.cancelSelectMenu();
            return;
        }
        if (parentMenu) {
            state.selectMenuAction = undefined;
            state.closeSelectMenu();
            state.selectMenu = parentMenu;
            state.selectMenuAction = currentMenu.parentMenuAction;
            state.syncDerivedInputFocus();
            return;
        }
        await state.cancelSelectMenu();
    }

export function setSelectMenuIndex(state: AgentConsoleSessionState, index: number): void {
        if (!state.selectMenu || !state.selectMenu.options.length) {
            return;
        }
        state.selectMenuTouched = true;
        state.selectMenu.selectedIndex = state.overlayController.clampIndex(index, state.selectMenu.options.length);
    }

export function moveSelectMenu(state: AgentConsoleSessionState, delta: number): void {
        state.selectMenuTouched = true;
        if (!state.selectMenu || !state.selectMenu.options.length) {
            return;
        }
        state.selectMenu.selectedIndex = state.overlayController.moveIndex(
            state.selectMenu.selectedIndex,
            delta,
            state.selectMenu.options.length
        );
    }

export function moveSelectMenuToEdge(state: AgentConsoleSessionState, edge: 'start' | 'end'): void {
        state.selectMenuTouched = true;
        if (!state.selectMenu || !state.selectMenu.options.length) {
            return;
        }
        state.selectMenu.selectedIndex = edge === 'start'
            ? state.overlayController.homeIndex(state.selectMenu.options.length)
            : state.overlayController.endIndex(state.selectMenu.options.length);
    }

export function moveSelectMenuPage(state: AgentConsoleSessionState, direction: 1 | -1): void {
        state.selectMenuTouched = true;
        if (!state.selectMenu || !state.selectMenu.options.length) {
            return;
        }
        state.selectMenu.selectedIndex = state.overlayController.pageIndex(
            state.selectMenu.selectedIndex,
            direction,
            state.selectMenu.options.length
        );
    }

export function isArgumentSuggestionMenu(state: AgentConsoleSessionState, menu: AgentConsoleSelectMenu | undefined): boolean {
        if (!menu || !isAgentConsoleSuggestionMenu(menu) || !state.submitAction) {
            return false;
        }
        return !!getAgentConsoleArgumentRange(state.input, state.inputCursor);
    }

export function shouldSubmitConfirmedSelectMenuValue(state: AgentConsoleSessionState, menu: AgentConsoleSelectMenu | undefined, value?: string): boolean {
        if (!menu || !state.submitAction) {
            return false;
        }
        const resolved = String(value || '').trim();
        if (!resolved) {
            return false;
        }
        if (resolved.startsWith('/')) {
            const def = getAgentConsoleCommandDefinition(resolved);
            return !def || !def.needsArgs;
        }
        if (!isAgentConsoleSuggestionMenu(menu) || !resolved.startsWith('@')) {
            return false;
        }
        // Only submit for known mention candidates (@workspace, @model, @tools, @session, @toolName).
        // Workspace file/directory path suggestions should insert into input without submitting.
        const mentionCandidates = getAgentConsoleMentionCandidates(state.tools);
        return mentionCandidates.includes(resolved);
    }

function matchesSelectMenuFilter(option: AgentConsoleSelectOption, filter: string): boolean {
        return `${option.label} ${option.value} ${option.description || ''}`.toLowerCase().includes(filter);
    }

/** Recompute the visible options for a blocking menu from its full list. */
export function setSelectMenuFilter(state: AgentConsoleSessionState, filter: string): void {
        const menu = state.selectMenu;
        if (!menu) return;
        const source = (menu.allOptions || menu.options).slice();
        const value = String(filter || '').toLowerCase();
        menu.allOptions = source;
        menu.filter = value;
        menu.options = value ? source.filter(option => matchesSelectMenuFilter(option, value)) : source.slice();
        menu.selectedIndex = 0;
        state.selectMenuTouched = true;
        state.syncDerivedInputFocus();
    }

/**
 * Type-to-filter for blocking select menus.
 *
 * Digits keep their numbered-selection meaning while the filter is empty; once
 * the user has typed a filter they become part of the query (model names such
 * as `gpt-4o`). `q` keeps its dismiss meaning only for an empty filter.
 */
export function applySelectMenuFilterInput(state: AgentConsoleSessionState, text: string): boolean {
        const menu = state.selectMenu;
        const raw = String(text || '');
        if (!menu || !raw || /[\r\n\t]/.test(raw)
            || isAgentConsoleSuggestionMenu(menu) || menu.kind === 'palette') return false;
        if (/[\u0000-\u001f\u007f]/.test(raw)) return false;
        if (!menu.filter) {
            if (/^[0-9]$/.test(raw)) return false;
            if (/^q$/i.test(raw)) return false;
        }
        setSelectMenuFilter(state, `${menu.filter || ''}${raw}`);
        return true;
    }

export function backspaceSelectMenuFilter(state: AgentConsoleSessionState): boolean {
        const menu = state.selectMenu;
        if (!menu || menu.kind === 'palette' || !menu.filter) return false;
        setSelectMenuFilter(state, menu.filter.slice(0, -1));
        return true;
    }

/**
 * Keyboard routing for the open select menu: blocking dialogs take typed text
 * as a filter, then the overlay decides movement/confirm/dismiss. Suggestion
 * and palette menus keep their own query handling.
 */
export function handleSelectMenuInput(state: AgentConsoleSessionState, key: string, text: string): boolean {
        const menu = state.selectMenu;
        if (!menu) return false;
        if (!isAgentConsoleSuggestionMenu(menu) && menu.kind !== 'palette') {
            if (key === 'backspace' || text === '\b' || text === '\u007f') {
                if (backspaceSelectMenuFilter(state)) return true;
            } else if (applySelectMenuFilterInput(state, text)) {
                return true;
            }
        }
        const decision = state.overlayController.resolveMenuKey(key, text, menu.options.length);
        switch (decision.action) {
            case 'move': moveSelectMenu(state, decision.delta); return true;
            case 'home': moveSelectMenuToEdge(state, 'start'); return true;
            case 'end': moveSelectMenuToEdge(state, 'end'); return true;
            case 'page': moveSelectMenuPage(state, decision.direction); return true;
            case 'accept': void acceptSelectMenu(state); return true;
            case 'complete': void completeSelectMenu(state); return true;
            case 'choose': setSelectMenuIndex(state, decision.index); void acceptSelectMenu(state); return true;
            case 'digit-consume': return true;
            case 'cancel':
                state.setSuppressSuggestionMenu(true);
                void cancelSelectMenu(state);
                return false;
            case 'escape': void dismissSelectMenuLayer(state); return true;
            default: return false;
        }
    }

export async function confirmSelectMenu(state: AgentConsoleSessionState, value?: string): Promise<string | undefined> {
        // A filter can leave zero options; Enter must keep the dialog open
        // instead of closing it with an undefined answer.
        if (value === undefined && state.selectMenu && !state.selectMenu.options.length) {
            return undefined;
        }
        const resolved = value ?? state.selectedSelectMenuOption?.value;
        const action = state.selectMenuAction;
        state.selectMenuAction = undefined;
        state.closeSelectMenu();
        await action?.(resolved);
        return resolved;
    }

export async function confirmSelectMenuAndKeepOpen(state: AgentConsoleSessionState, value?: string): Promise<string | undefined> {
        const resolved = value ?? state.selectedSelectMenuOption?.value;
        const action = state.selectMenuAction;
        state.selectMenuAction = undefined;
        await action?.(resolved);
        return resolved;
    }

export async function completeSelectMenu(state: AgentConsoleSessionState, value?: string): Promise<string | undefined> {
        return state.confirmSelectMenu(value);
    }

export async function acceptSelectMenu(state: AgentConsoleSessionState, value?: string): Promise<{ value: string | undefined; submitted: boolean }> {
        const menu = state.selectMenu;
        // Enter executes. A subcommand/enum-argument suggestion (`/statusline
        // list`) restores the word the user already typed, so confirming it
        // must also submit the command; otherwise the first Enter silently
        // closed the menu and only a second Enter ran the command.
        const argumentCompletion = state.isArgumentSuggestionMenu(menu);
        const resolved = await state.confirmSelectMenu(value);
        const submitted = argumentCompletion || state.shouldSubmitConfirmedSelectMenuValue(menu, resolved);
        if (submitted && resolved) {
            if (isAgentConsoleSuggestionMenu(menu)) {
                const next = applyAgentConsoleSuggestion(state.input, state.inputCursor, resolved);
                state.setInput(next.value, next.cursor);
            } else {
                const valueWithSpace = resolved + ' ';
                state.setInput(valueWithSpace, valueWithSpace.length);
            }
            await state.submitAction?.();
        }
        return {
            value: resolved,
            submitted
        };
    }

export async function acceptSelectMenuIndex(state: AgentConsoleSessionState, index: number): Promise<{ value: string | undefined; submitted: boolean }> {
        if (!state.selectMenu || !state.selectMenu.options.length) {
            return {
                value: undefined,
                submitted: false
            };
        }
        state.setSelectMenuIndex(index);
        return state.acceptSelectMenu(state.selectedSelectMenuOption?.value);
    }

export async function chooseSelectMenuIndex(state: AgentConsoleSessionState, index: number): Promise<void> {
        if (!state.selectMenu || !state.selectMenu.options.length) {
            return;
        }
        state.setSelectMenuIndex(index);
        await state.confirmSelectMenu(state.selectedSelectMenuOption?.value);
    }

export async function cancelSelectMenu(state: AgentConsoleSessionState): Promise<void> {
        const action = state.selectMenuAction;
        state.selectMenuAction = undefined;
        state.closeSelectMenu();
        await action?.(undefined);
    }

export async function openSubSelectMenu(state: AgentConsoleSessionState, title: string, options: AgentConsoleSelectOption[], selectedIndex = 0, hint?: string): Promise<void> {
        dismissBackgroundPanels(state);
        const currentMenu = state.selectMenu;
        const currentAction = state.selectMenuAction;

        state.selectMenu = {
            title,
            hint: hint || state.consoleOptions.selectHint,
            options: options.slice(),
            allOptions: options.slice(),
            filter: '',
            selectedIndex: Math.max(0, Math.min(Math.max(options.length - 1, 0), selectedIndex)),
            parentMenu: currentMenu,
            parentMenuAction: currentAction
        };
        state.syncDerivedInputFocus();
    }

export async function resolveSelectMenu(state: AgentConsoleSessionState, value: string | undefined): Promise<void> {
        const action = state.selectMenuAction;
        state.selectMenuAction = undefined;
        state.closeSelectMenu();
        await action?.(value);
    }

export function resolveSelectedSelectMenuOption(state: AgentConsoleSessionState): AgentConsoleSelectOption | undefined {
        if (!state.selectMenu) {
            return undefined;
        }
        return state.selectMenu.options[state.selectMenu.selectedIndex];
    }
