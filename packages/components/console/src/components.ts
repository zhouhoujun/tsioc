import { Attribute, Component } from '@tsdi/components';

@Component({
    selector: 'input',
    template: `
    <section class="tui-input-shell" v-style="shellStyle">
        <span class="tui-input-prompt" v-style="promptStyle">{{displayPrompt}}</span>
        <span class="tui-input-value" v-style="valueStyle">{{displayValue}}</span>
        <span class="tui-input-cursor" v-style="cursorStyle">{{cursorChar}}</span>
    </section>
    `
})
export class TuiInputComponent {
    @Attribute() prompt = '> ';
    @Attribute() value = '';
    @Attribute() cursor = ' ';
    @Attribute() cursorPos = 0;
    @Attribute() shellStyle = 'background: #1b2128; color: #c9d1d9; padding: 1 3;';
    @Attribute() promptStyle = 'color: #7ee787; font-weight: bold;';
    @Attribute() valueStyle = 'color: #c9d1d9;';
    @Attribute() cursorStyle = 'color: #7ee787; background: #2ea043;';

    get displayPrompt(): string {
        return this.prompt;
    }

    get displayValue(): string {
        const value = String(this.value || '');
        const pos = Math.max(0, Math.min(this.cursorPos, value.length));
        return value.slice(0, pos);
    }

    get cursorChar(): string {
        const value = String(this.value || '');
        const pos = Math.max(0, Math.min(this.cursorPos, value.length));
        return pos < value.length ? value[pos] : this.cursor;
    }
}

@Component({
    selector: 'select',
    template: `
    <section class="tui-select-shell" v-style="shellStyle">
        <p class="tui-select-title" v-style="titleStyle">{{title}}</p>
        <p class="tui-select-meta" v-style="metaStyle" v-show="metaLabel">{{metaLabel}}</p>
        <p class="tui-select-option" v-style="optionStyleAt(0)" v-show="optionLabelAt(0)">{{optionLabelAt(0)}}</p>
        <p class="tui-select-option" v-style="optionStyleAt(1)" v-show="optionLabelAt(1)">{{optionLabelAt(1)}}</p>
        <p class="tui-select-option" v-style="optionStyleAt(2)" v-show="optionLabelAt(2)">{{optionLabelAt(2)}}</p>
        <p class="tui-select-option" v-style="optionStyleAt(3)" v-show="optionLabelAt(3)">{{optionLabelAt(3)}}</p>
        <p class="tui-select-option" v-style="optionStyleAt(4)" v-show="optionLabelAt(4)">{{optionLabelAt(4)}}</p>
        <p class="tui-select-option" v-style="optionStyleAt(5)" v-show="optionLabelAt(5)">{{optionLabelAt(5)}}</p>
        <p class="tui-select-hint" v-style="hintStyle" v-show="hint">{{hint}}</p>
    </section>
    `
})
export class TuiSelectComponent {
    @Attribute() title = '';
    @Attribute() hint = '';
    @Attribute() options: Array<{ label: string; value: string; description?: string }> = [];
    @Attribute() selectedIndex = 0;
    @Attribute() shellStyle = 'background: #10161d; color: #d6dee6; padding: 1; border: 1px solid #2a3441;';
    @Attribute() titleStyle = 'color: #f3f6fb; font-weight: bold;';
    @Attribute() metaStyle = 'color: #6f7c8a;';
    @Attribute() hintStyle = 'color: #6f7c8a;';
    @Attribute() optionActiveStyle = 'background: #18222d; color: #8fd0ff; padding: 0 1; font-weight: bold;';
    @Attribute() optionStyle = 'background: #10161d; color: #93a4b8; padding: 0 1;';

    protected readonly VISIBLE = 6;

    get metaLabel(): string {
        return this.options.length ? `${this.selectedIndex + 1}/${this.options.length}` : '';
    }

    protected get visibleStart(): number {
        if (this.options.length <= this.VISIBLE) { return 0; }
        return Math.max(0, Math.min(this.options.length - this.VISIBLE,
            this.selectedIndex - Math.floor(this.VISIBLE / 2)));
    }

    protected get visibleOptions(): Array<{ label: string; value: string; description?: string }> {
        return this.options.slice(this.visibleStart, this.visibleStart + this.VISIBLE);
    }

    optionLabelAt(index: number): string {
        const opt = this.visibleOptions[index];
        if (!opt) { return ''; }
        const absIdx = this.visibleStart + index;
        const marker = absIdx === this.selectedIndex ? '›' : ' ';
        const num = absIdx + 1;
        const desc = opt.description ? `  ${opt.description}` : '';
        return `${marker} ${num}. ${opt.label}${desc}`;
    }

    optionStyleAt(index: number): Record<string, string> {
        const opt = this.visibleOptions[index];
        if (!opt) { return {}; }
        const absIdx = this.visibleStart + index;
        return this.parseStyle(absIdx === this.selectedIndex ? this.optionActiveStyle : this.optionStyle);
    }

    protected parseStyle(value: string): Record<string, string> {
        const style: Record<string, string> = {};
        String(value || '').split(';').map(s => s.trim()).filter(Boolean).forEach(part => {
            const idx = part.indexOf(':');
            if (idx < 0) { return; }
            style[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
        });
        return style;
}
    }


@Component({
    selector: 'label',
    template: `<label class="tui-label" v-style="labelStyle"><ng-content></ng-content></label>`
})
export class LabelComponent {
    @Attribute() labelStyle = 'color: #6e7681;';
}
