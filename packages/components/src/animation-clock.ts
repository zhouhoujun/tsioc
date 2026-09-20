import { Injectable } from '@tsdi/ioc';

/** Renderer-owned clock used by time-based directives. */
@Injectable()
export abstract class AnimationClock {
    abstract subscribe(listener: () => void): void;
    abstract unsubscribe(listener: () => void): void;
}
