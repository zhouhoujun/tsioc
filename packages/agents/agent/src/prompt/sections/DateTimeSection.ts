import { PromptSection, PromptSectionContext } from '../PromptSection';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class DateTimeSection extends PromptSection {
    name(): string { return 'date-time'; }
    priority = 0;

    render(context: PromptSectionContext): string {
        return `Current date and time: ${context.dateTime}`;
    }
}
