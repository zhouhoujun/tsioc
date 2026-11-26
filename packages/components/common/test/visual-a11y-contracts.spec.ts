import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { UI_CSS } from '../src/ui.styles';
import { UI_DESIGN_TOKENS } from '../src/design-tokens';
import { FieldComponent } from '../field';
import { TextFieldComponent } from '../text-field';
import { ToolbarComponent } from '../toolbar';
import { TabBarComponent } from '../tab-bar';
import { SpinnerComponent } from '../spinner';
import { ToastProviderComponent } from '../toast';

@Suite('common visual and a11y contracts')
export class VisualA11yContractsTest {
    @Test('shared skins expose the standard state hooks')
    async cssContracts() {
        expect(UI_CSS).toContain('.ui-button-group');
        expect(UI_CSS).toContain('.ui-field-pending');
        expect(UI_CSS).toContain('.ui-tree-check');
        expect(UI_CSS).toContain('--ui-motion-fast');
        expect(UI_CSS).toContain('prefers-reduced-motion');
        expect(UI_DESIGN_TOKENS).toContain('--ui-space-2');
        expect(UI_DESIGN_TOKENS).toContain('--ui-radius-md');
        expect(UI_DESIGN_TOKENS).toContain('--ui-focus-ring-width');
        expect(UI_CSS).toContain('--ui-radius-md');
    }

    @Test('field and text-field expose pending/valid/invalid states')
    async fieldStates() {
        const field = new FieldComponent();
        field.pending = true;
        expect(field.status).toEqual('pending');
        field.pending = false;
        field.valid = true;
        expect(field.status).toEqual('valid');
        field.error = 'Bad';
        expect(field.status).toEqual('invalid');

        const text = new TextFieldComponent();
        text.pending = true;
        expect(text.status).toEqual('pending');
        expect(text.fieldClass).toContain('is-pending');
    }

    @Test('toolbar, tab bar, spinner and toast expose the new contracts')
    async componentContracts() {
        const toolbar = new ToolbarComponent();
        toolbar.items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
        toolbar.maxVisible = 1;
        expect(toolbar.hasOverflow).toEqual(true);
        expect(toolbar.overflowItems.length).toEqual(2);

        const tabs = new TabBarComponent();
        tabs.source = { visible: true, windowed: true, canScrollForward: true,
            items: [{ id: 'a', label: 'A' }],
            overflowItems: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
        expect(tabs.arrowsVisible).toEqual(false);
        expect(tabs.overflowMenuVisible).toEqual(true);

        const spinner = new SpinnerComponent();
        spinner.tone = 'success';
        spinner.size = 'sm';
        expect(spinner.spinnerClass).toContain('is-success');
        expect(spinner.spinnerClass).toContain('is-sm');

        const provider = new ToastProviderComponent();
        provider.onInit();
        provider.show('Notice', { durationMs: 0 });
        expect(provider.entries.length).toEqual(1);
        provider.onDestroy();
    }
}
