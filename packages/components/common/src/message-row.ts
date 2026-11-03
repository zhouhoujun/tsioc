import { Attribute, Component } from '@tsdi/components';

export interface MessageToken {
    text: string;
    style?: Record<string, string> | string;
}

export interface MessageRowStyles {
    item?: Record<string, string> | string;
    status?: Record<string, string> | string;
    role?: Record<string, string> | string;
    prefix?: Record<string, string> | string;
    line?: Record<string, string> | string;
    meta?: Record<string, string> | string;
}

/**
 * Renderer-neutral message row: status marker, role, prefix, token content,
 * collapse hint and meta. Agent hosts provide semantics and styles; the
 * console/html renderers own layout and chrome.
 */
@Component({
    selector: 'message-row',
    template: `
    <label class="message-line" v-style="styles.item" aria-label="{{ariaLabel}}" data-hover="{{toggleContent ? 'fade' : 'none'}}" @click="toggle">
        <span v-style="styles.status">{{status}}</span>
        <span v-style="styles.role" v-show="role">{{role}}</span>
        <span v-style="styles.prefix" v-show="prefix">{{prefix}}</span>
        <span v-style="styles.line">
            <span class="message-content">
                <span class="message-token" v-style="token.style" v-for="token in tokens">{{token.text}}</span>
            </span>
        </span>
        <span class="message-detail-toggle" v-style="styles.line" v-if="toggleContent">{{toggleContent}}</span>
        <span v-style="styles.meta" v-show="meta">{{meta}}</span>
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
    @Attribute() styles: MessageRowStyles = {};
    @Attribute() toggleAction?: () => void;

    toggle(): void {
        this.toggleAction?.();
    }
}
