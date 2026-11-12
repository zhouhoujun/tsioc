import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InputFieldComponent } from '../src/AgentConsoleInputField';
import { MessageRowComponent } from '../src/AgentConsoleMessageRow';

@Suite('agent console primitive components')
export class AgentConsolePrimitiveComponentsTest {
    @Test('message row forwards toggle action and keeps token text')
    messageRowToggle() {
        const row = new MessageRowComponent();
        row.tokens = [{ text: 'hello' }, { text: ' world' }];
        row.toggleContent = '…';
        let toggled = 0;
        row.toggleAction = () => { toggled += 1; };
        row.toggle();
        expect(toggled).toEqual(1);
        expect(row.tokens.map(token => token.text).join('')).toEqual('hello world');
    }

    @Test('input field forwards editing events')
    inputFieldEvents() {
        const field = new InputFieldComponent();
        field.value = 'draft';
        let input = 0;
        let cursor = 0;
        let key = '';
        field.inputAction = () => { input += 1; };
        field.cursorAction = () => { cursor += 1; };
        field.keydownAction = event => { key = event.key; };
        field.emitInput({} as Event);
        field.emitCursor({} as Event);
        field.emitKeydown({ key: 'Enter' } as KeyboardEvent);
        expect(field.value).toEqual('draft');
        expect(input).toEqual(1);
        expect(cursor).toEqual(1);
        expect(key).toEqual('Enter');
    }
}
