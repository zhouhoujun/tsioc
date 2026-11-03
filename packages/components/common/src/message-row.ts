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
    <label class="message-line" v-style="itemStyle" aria-label="{{ariaLabel}}" data-hover="{{toggleContent ? 'fade' : 'none'}}" @click="toggle">
        <span v-style="statusStyle">{{status}}</span>
        <span v-style="roleStyle" v-show="role">{{role}}</span>
        <span v-style="prefixStyle" v-show="prefix">{{prefix}}</span>
        <span v-style="lineStyle">
            <span class="message-content">
                <span class="message-token" v-style="token.style" v-for="token in tokens">{{token.text}}</span>
            </span>
        </span>
        <span class="message-detail-toggle" v-style="lineStyle" v-if="toggleContent">{{toggleContent}}</span>
        <span v-style="metaStyle" v-show="meta">{{meta}}</span>
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
    @Attribute() itemStyle: Record<string, string> | string = {};
    @Attribute() statusStyle: Record<string, string> | string = {};
    @Attribute() roleStyle: Record<string, string> | string = {};
    @Attribute() prefixStyle: Record<string, string> | string = {};
    @Attribute() lineStyle: Record<string, string> | string = {};
    @Attribute() metaStyle: Record<string, string> | string = {};
    @Attribute() toggleAction?: () => void;

    toggle(): void {
        this.toggleAction?.();
    }
}
