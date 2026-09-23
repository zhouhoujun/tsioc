import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import type { AgentConsoleSelectOption } from '../src';
import { AGENT_CONSOLE_OVERLAY_HINTS, AGENT_CONSOLE_OVERLAY_TITLES, AGENT_CONSOLE_OVERLAY_EMPTY_STATES, resolveOverlayHint, resolveOverlayTitle, resolveOverlayEmptyState, buildOverlayPresentation, composeOverlayLines, resolveOverlaySelectWindow } from '../src/AgentConsoleOverlayPresenter';
import type { AgentConsoleOverlayKind, AgentConsoleOverlayPresentation } from '../src/AgentConsoleOverlayPresenter';
import { getDisplayWidth, fitByDisplayWidth } from '../src/AgentConsoleTextWidth';

const option = (label: string, extra: Partial<AgentConsoleSelectOption> = {}): AgentConsoleSelectOption => {
    return { label, value: label, ...extra };
};

const selectOpts = (labels: string[]): AgentConsoleSelectOption[] => labels.map(l => option(l));

const maxWidth = 80;

@Suite('Agent console overlay presenter (P274)')
export class AgentConsoleOverlayPresenterTest {

    @Test('hint catalog has all kind entries')
    async hintCatalogHasAllEntries() {
        const kinds: AgentConsoleOverlayKind[] = ['select', 'palette', 'suggestions', 'approvals', 'pending-question', 'outputs', 'tasks', 'detail-scroll'];
        for (const kind of kinds) {
            const hint = AGENT_CONSOLE_OVERLAY_HINTS[kind];
            expect(hint).toBeTruthy();
            expect(typeof hint).toBe('string');
        }
    }

    @Test('select hint matches consoleOptions default')
    async selectHintMatchesDefault() {
        // The catalog select hint must equal the SessionState selectHint default value
        const selectHint = AGENT_CONSOLE_OVERLAY_HINTS.select;
        expect(selectHint).toBe('1-9 select   up/down move   enter confirm   q cancel');
    }

    @Test('palette hint from inline component')
    async paletteHintFromComponent() {
        expect(AGENT_CONSOLE_OVERLAY_HINTS.palette).toBe('type to filter   enter execute');
    }

    @Test('suggestions hint from suggestions const')
    async suggestionsHintFromSuggestions() {
        expect(AGENT_CONSOLE_OVERLAY_HINTS.suggestions).toBe('enter 执行   tab 补全   up/down 选择');
    }

    @Test('approvals hint from session defaults')
    async approvalsHintFromSessionDefaults() {
        expect(AGENT_CONSOLE_OVERLAY_HINTS.approvals).toBe('a allow   d deny   y copy   up/down move   esc dismiss');
    }

    @Test('title catalog entries exist')
    async titleCatalogHasEntries() {
        const kinds: AgentConsoleOverlayKind[] = ['palette', 'suggestions', 'approvals', 'pending-question', 'outputs', 'tasks', 'detail-scroll'];
        for (const kind of kinds) {
            const title = AGENT_CONSOLE_OVERLAY_TITLES[kind];
            expect(title).toBeTruthy();
        }
    }

    @Test('palette title is Command palette')
    async paletteTitleIsCommandPalette() {
        expect(AGENT_CONSOLE_OVERLAY_TITLES.palette).toBe('Command palette');
    }

    @Test('suggestions title is Suggestions')
    async suggestionsTitleIsSuggestions() {
        expect(AGENT_CONSOLE_OVERLAY_TITLES.suggestions).toBe('Suggestions');
    }

    @Test('approvals title is Approvals')
    async approvalsTitleIsApprovals() {
        expect(AGENT_CONSOLE_OVERLAY_TITLES.approvals).toBe('Approvals');
    }

    @Test('hint resolution with explicit override wins')
    async hintResolutionExplicitWins() {
        const explicit = 'custom hint';
        const result = resolveOverlayHint('select', explicit);
        expect(result).toBe(explicit);
    }

    @Test('hint resolution falls back to catalog')
    async hintResolutionFallbackToCatalog() {
        const result = resolveOverlayHint('select');
        expect(result).toBe('1-9 select   up/down move   enter confirm   q cancel');
    }

    @Test('hint resolution falls back to select for unknown kind')
    async hintResolutionUnknownKindFallback() {
        const result = resolveOverlayHint('pending-question' as AgentConsoleOverlayKind);
        expect(result).toBe('1-9 select   up/down move   enter confirm   q cancel');
    }

    @Test('title resolution with explicit override wins')
    async titleResolutionExplicitWins() {
        const result = resolveOverlayTitle('palette', 'Custom Palette');
        expect(result).toBe('Custom Palette');
    }

    @Test('title resolution falls back to catalog')
    async titleResolutionFallbackToCatalog() {
        const result = resolveOverlayTitle('palette');
        expect(result).toBe('Command palette');
    }

    @Test('emptyState resolution returns explicit when given')
    async emptyStateResolutionExplicit() {
        const result = resolveOverlayEmptyState('select', 'No items available');
        expect(result).toBe('No items available');
    }

    @Test('emptyState resolution returns catalog default when no options')
    async emptyStateResolutionCatalogDefault() {
        // select has no catalog empty state defined → undefined
        const result = resolveOverlayEmptyState('select');
        expect(result).toBeUndefined();
    }

    @Test('buildOverlayPresentation resolves kind title hint emptyState')
    async buildPresentationResolvesFields() {
        const presentation = buildOverlayPresentation({
            kind: 'suggestions',
            options: selectOpts(['item1', 'item2']),
            selectedIndex: 0,
        });
        expect(presentation.kind).toBe('suggestions');
        expect(presentation.title).toBe('Suggestions');
        expect(presentation.hint).toBe('enter 执行   tab 补全   up/down 选择');
        expect(presentation.emptyState).toBeUndefined();
        expect(presentation.optionCount).toBe(2);
        expect(presentation.selectedIndex).toBe(0);
    }

    @Test('buildPresentation clamps selectedIndex')
    async buildPresentationClampsIndex() {
        const presentation = buildOverlayPresentation({
            kind: 'select',
            options: selectOpts(['a', 'b', 'c']),
            selectedIndex: 99, // out of range
        });
        expect(presentation.selectedIndex).toBe(2); // clamped to last
    }

    @Test('buildPresentation sets emptyState when options empty')
    async buildPresentationEmptyStateWhenNoOptions() {
        const presentation = buildOverlayPresentation({
            kind: 'select',
            options: [],
            selectedIndex: 0,
        });
        // select has no catalog empty state → undefined
        expect(presentation.emptyState).toBeUndefined();
    }

    @Test('buildPresentation uses provided emptyState override')
    async buildPresentationEmptyStateOverride() {
        const presentation = buildOverlayPresentation({
            kind: 'select',
            options: [],
            selectedIndex: 0,
            emptyState: 'No selections available',
        });
        expect(presentation.emptyState).toBe('No selections available');
    }

    @Test('composeOverlayLines mirrors renderSelectMenu line shape')
    async composeOverlayLinesLineShape() {
        const presentation: AgentConsoleOverlayPresentation = {
            kind: 'select',
            title: 'Select Menu',
            hint: '1-9 select   up/down move   enter confirm   q cancel',
            options: selectOpts(['option A', 'option B', 'option C']),
            selectedIndex: 1,
            optionCount: 3,
        };
        const lines = composeOverlayLines(presentation, maxWidth);
        // Should have: title lines, '', option rows, '', hint
        expect(lines.length).toBeGreaterThan(2);
        // First non-empty line should be the title
        expect(lines[0]).toContain('Select Menu');
        // There should be a blank line after title
        expect(lines[1]).toBe('');
        // Last line should be the hint
        expect(lines[lines.length - 1]).toBe('1-9 select   up/down move   enter confirm   q cancel');
        // Hint should be CJK-safe fit
        expect(fitByDisplayWidth(lines[lines.length - 1], maxWidth)).toBe(lines[lines.length - 1]);
    }

    @Test('composeOverlayLines includes emptyState when no options')
    async composeOverlayLinesWithEmptyState() {
        const presentation: AgentConsoleOverlayPresentation = {
            kind: 'select',
            title: 'Select',
            hint: 'hint',
            options: [],
            selectedIndex: 0,
            emptyState: 'No selections available',
        };
        const lines = composeOverlayLines(presentation, maxWidth);
        // Should have title, '', empty state line, '', hint
        expect(lines[0]).toContain('Select');
        expect(lines[1]).toBe('');
        expect(lines[2]).toBe('No selections available');
        expect(lines[3]).toBe('');
        expect(lines[4]).toBe('hint');
    }

    @Test('composeOverlayLines CJK-safe widths')
    async composeOverlayLinesCJKSafeWidths() {
        const presentation: AgentConsoleOverlayPresentation = {
            kind: 'palette',
            title: 'Command palette: 查找',
            hint: 'type to filter   enter execute',
            options: selectOpts(['item1', 'item2']),
            selectedIndex: 0,
            optionCount: 2,
        };
        const lines = composeOverlayLines(presentation, maxWidth);
        // All lines should fit within maxWidth (CJK char '查' counts as 2 cols)
        lines.forEach((line, i) => {
            const width = getDisplayWidth(line);
            expect(width).toBeLessThanOrEqual(maxWidth);
        });
    }

    @Test('resolveOverlaySelectWindow computes correct window')
    async resolveSelectWindowCorrectness() {
        // window of 3 options, selected at index 5, total 10 options
        const { start, count } = resolveOverlaySelectWindow(10, 5, 3);
        expect(start).toBe(4); // options 4,5,6 visible
        expect(count).toBe(3);
    }

    @Test('resolveOverlaySelectWindow clamps at boundaries')
    async resolveSelectWindowBoundaryClamping() {
        // selected at 0, total 5, window of 3 → start should be 0
        const { start } = resolveOverlaySelectWindow(5, 0, 3);
        expect(start).toBe(0);
        // selected at 4, total 5, window of 3 → start should be 2 (options 2,3,4)
        const { start: s2 } = resolveOverlaySelectWindow(5, 4, 3);
        expect(s2).toBe(2);
    }
}
