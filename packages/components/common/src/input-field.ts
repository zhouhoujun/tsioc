import { Attribute, Component } from '@tsdi/components';

/**
 * Renderer-neutral input field. The host owns editing semantics and state; the
 * console/html renderers own textarea sizing, cursor painting and wrapping.
 */
@Component({
    selector: 'input-field',
    template: `
    <textarea
        class="agent-input"
        v-style="fieldStyle"
        value="{{value}}"
        prompt="{{prompt}}"
        placeholder="{{placeholder}}"
        cursor=" "
        cursorPos="{{cursorPos}}"
        [focused]="focused"
        showCursor="false"
        cursorStyle="{{cursorStyle}}"
        cursorTarget="input"
        continuationPrompt="{{continuationPrompt}}"
        mask="{{mask}}" data-hover="none"
        @input="emitInput($event)"
        @click="emitCursor($event)"
        @keyup="emitCursor($event)"
        @keydown="emitKeydown($event)"></textarea>`
})
export class InputFieldComponent {
    @Attribute() value = '';
    @Attribute() prompt = '';
    @Attribute() placeholder = '';
    @Attribute() cursorPos = 0;
    @Attribute() focused = true;
    @Attribute() cursorStyle = 'color: #7ee787;';
    @Attribute() continuationPrompt = '  ';
    @Attribute() mask = false;
    @Attribute() fieldStyle: Record<string, string> | string = {};
    @Attribute() inputAction?: (event: Event) => void;
    @Attribute() cursorAction?: (event: Event) => void;
    @Attribute() keydownAction?: (event: KeyboardEvent) => void;

    emitInput(event: Event): void {
        this.inputAction?.(event);
    }

    emitCursor(event: Event): void {
        this.cursorAction?.(event);
    }

    emitKeydown(event: KeyboardEvent): void {
        this.keydownAction?.(event);
    }
}
