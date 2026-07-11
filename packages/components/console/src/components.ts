import { Attribute, Directive } from '@tsdi/components';

@Directive({
    selector: 'input'
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

@Directive({
    selector: 'select'
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

@Directive({
    selector: 'label'
})
export class LabelComponent {
    @Attribute() labelStyle = 'color: #6e7681;';
}


@Directive({
    selector: 'span'
})
export class SpanDirective {
    @Attribute() textStyle = '';
}

@Directive({
    selector: 'div'
})
export class DivDirective {
    @Attribute() blockStyle = '';
}

@Directive({
    selector: 'br'
})
export class BrDirective {
}
