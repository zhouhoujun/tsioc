import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ConsoleElement } from '../src/console';

@Suite('console selectors')
export class ConsoleSelectorTest {
    @Test('matches compound, descendant and child selectors')
    matchesSelectors() {
        const root = new ConsoleElement('div');
        root.classList.add('outer');
        root.setAttribute('data-kind', 'root');
        const middle = new ConsoleElement('section');
        middle.classList.add('middle');
        const item = new ConsoleElement('span');
        item.classList.add('item');
        item.setAttribute('data-value', '1');

        root.appendChild(middle);
        middle.appendChild(item);

        expect(item.matches('span')).toBeTruthy();
        expect(item.matches('.item')).toBeTruthy();
        expect(item.matches('[data-value="1"]')).toBeTruthy();
        expect(item.matches('.outer .item')).toBeTruthy();
        expect(item.matches('div > section > span')).toBeTruthy();
        expect(item.matches('.middle > .item')).toBeTruthy();
        expect(item.matches('.missing .item')).toBeFalsy();
        expect(item.matches('div > .item')).toBeFalsy();
        expect(item.matches('span, .missing')).toBeTruthy();
    }
}
