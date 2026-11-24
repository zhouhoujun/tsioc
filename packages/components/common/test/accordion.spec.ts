import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AccordionComponent } from '../accordion';

@Suite('common accordion')
export class AccordionComponentTest {
    @Test('toggles an uncontrolled section and emits the next state')
    togglesUncontrolled() {
        const accordion = new AccordionComponent();
        accordion.title = 'HTTP';
        accordion.count = 4;
        const states: boolean[] = [];
        accordion.expandedChange.subscribe(value => states.push(value));

        expect(accordion.expanded).toEqual(true);
        expect(accordion.expandedText).toEqual('true');
        expect(accordion.hasCount).toEqual(true);
        expect(accordion.accordionClass).toContain('is-expanded');

        accordion.toggle();
        expect(accordion.expanded).toEqual(false);
        expect(accordion.expandedText).toEqual('false');
        expect(accordion.accordionClass).toContain('is-collapsed');
        expect(states).toEqual([false]);

        accordion.toggle();
        expect(accordion.expanded).toEqual(true);
        expect(states).toEqual([false, true]);
    }

    @Test('controlled sections leave the state to the host')
    controlledOnlyEmits() {
        const accordion = new AccordionComponent();
        accordion.controlled = true;
        accordion.expanded = false;
        const states: boolean[] = [];
        accordion.expandedChange.subscribe(value => states.push(value));

        accordion.toggle();
        expect(accordion.expanded).toEqual(false);
        expect(states).toEqual([true]);

        accordion.expanded = true;
        expect(accordion.expanded).toEqual(true);
        expect(accordion.expandedText).toEqual('true');
    }

    @Test('disabled sections do not toggle and zero counts are displayed')
    disabledAndCount() {
        const accordion = new AccordionComponent();
        accordion.disabled = true;
        accordion.count = 0;
        let changes = 0;
        accordion.expandedChange.subscribe(() => { changes += 1; });

        accordion.toggle();
        expect(accordion.expanded).toEqual(true);
        expect(changes).toEqual(0);
        expect(accordion.hasCount).toEqual(true);
        expect(accordion.accordionClass).toContain('is-disabled');

        accordion.count = '';
        expect(accordion.hasCount).toEqual(false);
        accordion.expanded = 'false';
        expect(accordion.expanded).toEqual(false);
    }
}
