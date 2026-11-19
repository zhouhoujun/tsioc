import expect = require('expect');
import { WORKFLOW_DESIGNER_CSS } from '../src/visual/components/workflow-designer.styles';

describe('Workflow Designer interaction styles', () => {
    it('animates toolbar button and tab hover states', () => {
        expect(WORKFLOW_DESIGNER_CSS).toMatch(/\.workflow-btn\s*{[^}]*transition:/);
        expect(WORKFLOW_DESIGNER_CSS).toMatch(/\.workflow-tabs \.tab\s*{[^}]*transition:/);
        expect(WORKFLOW_DESIGNER_CSS).toMatch(/\.workflow-tabs \.tab-new\s*{[^}]*transition:/);
        expect(WORKFLOW_DESIGNER_CSS).toMatch(
            /\.workflow-btn:hover:not\(:disabled\)\s*{[^}]*background:\s*var\(--wf-btn-hover-bg/
        );
        expect(WORKFLOW_DESIGNER_CSS).toMatch(
            /\.workflow-tabs \.tab:hover\s*{[^}]*background:\s*var\(--tab-hover/
        );
        expect(WORKFLOW_DESIGNER_CSS).toContain('--tab-hover: var(--wf-theme-hover');
        expect(WORKFLOW_DESIGNER_CSS).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('gives every theme its own visible hover colors', () => {
        const interaction = /\/\* Interaction tokens \*\/([\s\S]*)$/.exec(WORKFLOW_DESIGNER_CSS)?.[1] || '';
        expect(interaction).toBeTruthy();
        ['dark', 'solarized', 'high-contrast'].forEach(theme => {
            const block = new RegExp(`\\[data-theme="${theme}"\\]\\s*{([^}]*)}`)
                .exec(interaction)?.[1] || '';
            expect(block).toContain('--wf-theme-hover:');
            expect(block).toContain('--wf-btn-hover-bg:');
            expect(block).toContain('--wf-btn-primary-hover:');
            expect(block).toContain('--wf-btn-danger-hover-bg:');
        });
        // The dark hover surface must not collapse into the normal surface;
        // that was why the animation looked missing in dark mode.
        const dark = /\[data-theme="dark"\]\s*{([^}]*)}/.exec(interaction)?.[1] || '';
        expect(dark).toContain('--wf-btn-hover-bg: #1e293b;');
        expect(dark).toContain('--wf-btn-bg: var(--wf-theme-surface);');
    });
});
