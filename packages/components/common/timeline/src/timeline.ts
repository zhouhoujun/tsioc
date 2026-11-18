import { Attribute, Component } from '@tsdi/components';
import { normalizeTone, UiTone } from '../../src/ui';

export type TimelineStatus = 'pending' | 'running' | 'done' | 'error';

export interface TimelineItem {
    id?: string;
    title?: string;
    label?: string;
    detail?: string;
    time?: string;
    tone?: UiTone;
    status?: TimelineStatus;
}

interface TimelineViewItem {
    key: string;
    index: number;
    title: string;
    detail: string;
    time: string;
    marker: string;
    last: boolean;
    className: string;
    tone: UiTone;
    status: TimelineStatus;
}

/**
 * Vertical activity timeline. Status drives the marker glyph and the semantic
 * `data-status`/`data-tone` attributes; hosts own colors and spacing.
 */
@Component({
    selector: 'ui-timeline',
    template: `
    <ol class="ui-timeline {{timelineClass}}" role="list" aria-label="{{ariaLabel}}">
        <li class="{{timelineItemClass(entry)}}" data-status="{{timelineStatus(entry)}}" data-tone="{{timelineTone(entry)}}"
            v-for="entry in viewItems" trackBy="key">
            <span class="ui-timeline-marker" aria-hidden="true">{{timelineMarker(entry)}}</span>
            <span class="ui-timeline-connector" aria-hidden="true" v-if="!entry.last">│</span>
            <span class="ui-timeline-content">
                <span class="ui-timeline-title">{{entry.title}}</span>
                <span class="ui-timeline-time" v-if="entry.time">{{entry.time}}</span>
                <span class="ui-timeline-detail" v-if="entry.detail">{{entry.detail}}</span>
            </span>
        </li>
    </ol>`
})
export class TimelineComponent {
    @Attribute() items: TimelineItem[] = [];
    @Attribute() ariaLabel = 'Timeline';
    @Attribute() className = '';

    get timelineClass(): string {
        return this.className;
    }

    get viewItems(): TimelineViewItem[] {
        const items = Array.isArray(this.items) ? this.items : [];
        return items.map((item, index) => {
            const status = item?.status || 'pending';
            const tone = normalizeTone(item?.tone, status === 'error' ? 'danger' : status === 'done' ? 'success' : status === 'running' ? 'accent' : 'muted');
            return {
                key: String(item?.id ?? index),
                index,
                title: String(item?.title ?? item?.label ?? ''),
                detail: String(item?.detail ?? ''),
                time: String(item?.time ?? ''),
                marker: this.markerFor(status),
                last: index === items.length - 1,
                className: ['ui-timeline-item', `is-${status}`, `is-${tone}`].join(' '),
                tone,
                status
            };
        });
    }

    timelineStatus(entry: TimelineViewItem): TimelineStatus {
        return this.items[entry.index]?.status || 'pending';
    }

    timelineTone(entry: TimelineViewItem): UiTone {
        const item = this.items[entry.index];
        const status = item?.status || 'pending';
        return normalizeTone(item?.tone, status === 'error' ? 'danger' : status === 'done' ? 'success' : status === 'running' ? 'accent' : 'muted');
    }

    timelineItemClass(entry: TimelineViewItem): string {
        const status = this.timelineStatus(entry);
        return ['ui-timeline-item', `is-${status}`, `is-${this.timelineTone(entry)}`].join(' ');
    }

    timelineMarker(entry: TimelineViewItem): string {
        return this.markerFor(this.timelineStatus(entry));
    }

    private markerFor(status: TimelineStatus): string {
        switch (status) {
            case 'done':
                return '✓';
            case 'error':
                return '✕';
            case 'running':
                return '●';
            default:
                return '○';
        }
    }
}
