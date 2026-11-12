import { Attribute, Component } from '@tsdi/components';

export interface MessageToken {
    text: string;
    style?: Record<string, string> | string;
}

/**
 * Renderer-neutral message row: status marker, role, prefix, token content,
 * collapse hint and meta. Agent hosts provide semantics and styles; the
 * console/html renderers own layout and chrome.
 */
@Component({
    selector: 'message-row',
    template: `
    <label class="message-line" aria-label="{{ariaLabel}}" data-hover="{{hoverable || toggleContent ? 'fade' : 'none'}}" @click="toggle">
        <span class="message-status" v-if="status">{{status}}</span>
        <span class="message-role" v-if="role">{{role}}</span>
        <span class="message-prefix" v-if="prefix">{{prefix}}</span>
        <span class="message-line-content">
            <span class="message-content">
                <span class="message-token tone-{{token.tone || 'default'}}" v-for="token in tokens">{{token.text}}</span>
            </span>
        </span>
        <span class="message-detail-toggle" v-if="toggleContent">{{toggleContent}}</span>
        <span class="message-meta" v-if="meta">{{meta}}</span>
    </label>`
})
export class MessageRowComponent {
    @Attribute() tokens: MessageToken[] = [];
    @Attribute() status = '';
    @Attribute() role = '';
    @Attribute() prefix = '';
    @Attribute() meta = '';
    @Attribute() toggleContent = '';
    @Attribute() ariaLabel = '';
    @Attribute() hoverable = false;
    @Attribute() toggleAction?: () => void;

    toggle(): void {
        this.toggleAction?.();
    }
}
