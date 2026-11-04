import { parseConsoleDeclarations } from './stylesheet';

/** One percentage stop inside a CSS `@keyframes` rule. */
export interface ConsoleKeyframe {
    offset: number;
    declarations: Record<string, string>;
}

export interface ConsoleAnimationSpec {
    name: string;
    durationMs: number;
    delayMs: number;
    iterationCount: number;
    direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode: 'none' | 'forwards' | 'backwards' | 'both';
    timingFunction: string;
    playState: 'running' | 'paused';
}

export interface ConsoleAnimationFrame {
    /** Declarations to merge into the element style at this instant. */
    declarations?: Record<string, string>;
    /** Whether the animation still needs clock ticks. */
    running: boolean;
}

const TIMING_KEYWORDS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end']);
const DIRECTION_KEYWORDS = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse']);
const FILL_KEYWORDS = new Set(['none', 'forwards', 'backwards', 'both']);
const PLAY_KEYWORDS = new Set(['running', 'paused']);

/** Split a CSS comma list without splitting commas inside functions. */
function splitTopLevel(value: string, separator = ','): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let quote = '';
    for (const char of String(value || '')) {
        if (quote) {
            current += char;
            if (char === quote) quote = '';
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            current += char;
            continue;
        }
        if (char === '(') depth++;
        if (char === ')') depth = Math.max(0, depth - 1);
        if (char === separator && depth === 0) {
            result.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    if (current.trim()) result.push(current.trim());
    return result;
}

function splitTokens(value: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let depth = 0;
    for (const char of String(value || '').trim()) {
        if (char === '(') depth++;
        if (char === ')') depth = Math.max(0, depth - 1);
        if (/\s/.test(char) && depth === 0) {
            if (current) tokens.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    if (current) tokens.push(current);
    return tokens;
}

function isTime(value: string): boolean {
    return /^-?(?:\d+|\d*\.\d+)(?:ms|s)$/i.test(value);
}

function parseTimeMs(value: string, fallback = 0): number {
    const match = /^(-?(?:\d+|\d*\.\d+))(ms|s)$/i.exec(String(value || '').trim());
    if (!match) return fallback;
    const number = Number(match[1]);
    return match[2].toLowerCase() === 's' ? number * 1000 : number;
}

function parseIteration(value: string): number {
    if (String(value).toLowerCase() === 'infinite') return Infinity;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 1;
}

function stripQuotes(value: string): string {
    return String(value || '').replace(/^['"]|['"]$/g, '');
}

/** Parse all `@keyframes` blocks from a stylesheet. */
export function parseConsoleKeyframes(css: string): Map<string, ConsoleKeyframe[]> {
    const source = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const animations = new Map<string, ConsoleKeyframe[]>();
    const block = /@(?:-\w+-)?keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g;
    for (const match of source.matchAll(block)) {
        const name = match[1];
        const stops = new Map<number, Record<string, string>>();
        for (const frame of match[2].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            const declarations = parseConsoleDeclarations(frame[2]);
            if (!Object.keys(declarations).length) continue;
            for (const selector of frame[1].split(',')) {
                const value = selector.trim().toLowerCase();
                const offset = value === 'from' ? 0 : value === 'to' ? 1 : Number(value.replace('%', '')) / 100;
                if (!Number.isFinite(offset) || offset < 0 || offset > 1) continue;
                stops.set(offset, { ...(stops.get(offset) || {}), ...declarations });
            }
        }
        if (stops.size) {
            animations.set(name, [...stops.entries()]
                .sort((left, right) => left[0] - right[0])
                .map(([offset, declarations]) => ({ offset, declarations })));
        }
    }
    return animations;
}

function longhandList(styles: Record<string, string>, name: string): string[] {
    return splitTopLevel(styles[name] || '');
}

/** Parse `animation` / `animation-*` declarations for an element. */
export function parseConsoleAnimations(styles: Record<string, string>): ConsoleAnimationSpec[] {
    const names = longhandList(styles, 'animation-name');
    if (names.length) {
        const durations = longhandList(styles, 'animation-duration');
        const timing = longhandList(styles, 'animation-timing-function');
        const delays = longhandList(styles, 'animation-delay');
        const iterations = longhandList(styles, 'animation-iteration-count');
        const directions = longhandList(styles, 'animation-direction');
        const fills = longhandList(styles, 'animation-fill-mode');
        const play = longhandList(styles, 'animation-play-state');
        return names.map((rawName, index) => ({
            name: stripQuotes(rawName),
            durationMs: parseTimeMs(durations[index % Math.max(1, durations.length)] || '0s'),
            delayMs: parseTimeMs(delays[index % Math.max(1, delays.length)] || '0s'),
            iterationCount: parseIteration(iterations[index % Math.max(1, iterations.length)] || '1'),
            direction: (DIRECTION_KEYWORDS.has(String(directions[index] || '').toLowerCase())
                ? String(directions[index] || '').toLowerCase()
                : 'normal') as ConsoleAnimationSpec['direction'],
            fillMode: (FILL_KEYWORDS.has(String(fills[index] || '').toLowerCase())
                ? String(fills[index] || '').toLowerCase()
                : 'none') as ConsoleAnimationSpec['fillMode'],
            timingFunction: timing[index] || 'ease',
            playState: (String(play[index] || '').toLowerCase() === 'paused' ? 'paused' : 'running') as ConsoleAnimationSpec['playState']
        })).filter(spec => spec.name && spec.name !== 'none');
    }

    const shorthand = splitTopLevel(styles.animation || '')
        .map(parseAnimationShorthand)
        .filter((spec): spec is ConsoleAnimationSpec => !!spec && spec.name !== 'none');
    return applyLonghandOverrides(shorthand, styles);
}

function applyLonghandOverrides(specs: ConsoleAnimationSpec[], styles: Record<string, string>): ConsoleAnimationSpec[] {
    if (!specs.length) return specs;
    const names = longhandList(styles, 'animation-name');
    const durations = longhandList(styles, 'animation-duration');
    const timing = longhandList(styles, 'animation-timing-function');
    const delays = longhandList(styles, 'animation-delay');
    const iterations = longhandList(styles, 'animation-iteration-count');
    const directions = longhandList(styles, 'animation-direction');
    const fills = longhandList(styles, 'animation-fill-mode');
    const play = longhandList(styles, 'animation-play-state');
    const pick = (values: string[], index: number): string | undefined =>
        values.length ? values[index % values.length] : undefined;
    return specs.map((spec, index) => ({
        ...spec,
        name: stripQuotes(pick(names, index) || spec.name),
        durationMs: pick(durations, index) ? parseTimeMs(pick(durations, index)!, spec.durationMs) : spec.durationMs,
        delayMs: pick(delays, index) ? parseTimeMs(pick(delays, index)!, spec.delayMs) : spec.delayMs,
        iterationCount: pick(iterations, index) ? parseIteration(pick(iterations, index)!) : spec.iterationCount,
        direction: (DIRECTION_KEYWORDS.has(String(pick(directions, index) || '').toLowerCase())
            ? String(pick(directions, index)).toLowerCase()
            : spec.direction) as ConsoleAnimationSpec['direction'],
        fillMode: (FILL_KEYWORDS.has(String(pick(fills, index) || '').toLowerCase())
            ? String(pick(fills, index)).toLowerCase()
            : spec.fillMode) as ConsoleAnimationSpec['fillMode'],
        timingFunction: pick(timing, index) || spec.timingFunction,
        playState: (String(pick(play, index) || '').toLowerCase() === 'paused' ? 'paused' : spec.playState)
    }));
}

function parseAnimationShorthand(value: string): ConsoleAnimationSpec | undefined {
    if (!value.trim()) return undefined;
    const spec: ConsoleAnimationSpec = {
        name: 'none',
        durationMs: 0,
        delayMs: 0,
        iterationCount: 1,
        direction: 'normal',
        fillMode: 'none',
        timingFunction: 'ease',
        playState: 'running'
    };
    let timeCount = 0;
    for (const token of splitTokens(value)) {
        const lower = token.toLowerCase();
        if (isTime(token)) {
            if (timeCount === 0) spec.durationMs = parseTimeMs(token);
            else if (timeCount === 1) spec.delayMs = parseTimeMs(token);
            timeCount++;
            continue;
        }
        if (/^\d*\.?\d+$/.test(token) || lower === 'infinite') {
            spec.iterationCount = parseIteration(token);
            continue;
        }
        if (TIMING_KEYWORDS.has(lower) || /^(?:cubic-bezier|steps|linear)\(/i.test(token)) {
            spec.timingFunction = token;
            continue;
        }
        if (DIRECTION_KEYWORDS.has(lower)) {
            spec.direction = lower as ConsoleAnimationSpec['direction'];
            continue;
        }
        if (FILL_KEYWORDS.has(lower)) {
            spec.fillMode = lower as ConsoleAnimationSpec['fillMode'];
            continue;
        }
        if (PLAY_KEYWORDS.has(lower)) {
            spec.playState = lower as ConsoleAnimationSpec['playState'];
            continue;
        }
        if (lower === 'none') {
            spec.name = 'none';
            continue;
        }
        spec.name = stripQuotes(token);
    }
    return spec;
}

function timingEase(progress: number, timing: string): number {
    const t = Math.max(0, Math.min(1, progress));
    const value = String(timing || '').trim().toLowerCase();
    const cubic = /^cubic-bezier\(\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/.exec(value);
    if (cubic) {
        return cubicBezier(t, Number(cubic[1]), Number(cubic[2]), Number(cubic[3]), Number(cubic[4]));
    }
    if (value.startsWith('steps(')) {
        const count = Math.max(1, Math.floor(Number(/\(([\d.]+)/.exec(value)?.[1] || 1)));
        return Math.floor(t * count) / count;
    }
    switch (value) {
        case 'linear':
            return t;
        case 'ease-in':
            return t * t * t;
        case 'ease-out':
            return 1 - Math.pow(1 - t, 3);
        case 'ease-in-out':
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        case 'step-start':
            return t <= 0 ? 0 : 1;
        case 'step-end':
            return t >= 1 ? 1 : 0;
        default:
            return 1 - Math.pow(1 - t, 3);
    }
}

function cubicBezier(progress: number, x1: number, y1: number, x2: number, y2: number): number {
    const sample = (t: number, p1: number, p2: number) => (3 * p1 - 3 * p2 + 1) * t * t * t + (3 * p2 - 6 * p1) * t * t + 3 * p1 * t;
    let lower = 0;
    let upper = 1;
    let t = progress;
    for (let index = 0; index < 12; index++) {
        const x = sample(t, x1, x2);
        if (Math.abs(x - progress) < 0.001) break;
        if (x < progress) lower = t;
        else upper = t;
        t = (lower + upper) / 2;
    }
    return sample(t, y1, y2);
}

function directionProgress(progress: number, direction: ConsoleAnimationSpec['direction'], iteration: number): number {
    switch (direction) {
        case 'reverse':
            return 1 - progress;
        case 'alternate':
            return iteration % 2 === 0 ? progress : 1 - progress;
        case 'alternate-reverse':
            return iteration % 2 === 0 ? 1 - progress : progress;
        default:
            return progress;
    }
}

function colorChannels(value: string): [number, number, number, number] | undefined {
    const text = String(value || '').trim().toLowerCase();
    const hex = /^#([0-9a-f]{3,8})$/.exec(text);
    if (hex) {
        let source = hex[1];
        if (source.length === 3 || source.length === 4) {
            source = source.split('').map(char => `${char}${char}`).join('');
        }
        if (source.length !== 6 && source.length !== 8) return undefined;
        return [
            parseInt(source.slice(0, 2), 16),
            parseInt(source.slice(2, 4), 16),
            parseInt(source.slice(4, 6), 16),
            source.length === 8 ? parseInt(source.slice(6, 8), 16) / 255 : 1
        ];
    }
    const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(text);
    if (rgb) {
        return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] == null ? 1 : Number(rgb[4])];
    }
    return undefined;
}

function toHex(channels: [number, number, number]): string {
    return `#${channels.map(value => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('')}`;
}

function interpolateValue(from: string, to: string, progress: number): string {
    if (from === to) return to;
    const fromColor = colorChannels(from);
    const toColor = colorChannels(to);
    if (fromColor && toColor) {
        const blended = fromColor.map((value, index) => value + (toColor[index] - value) * progress);
        return toHex([blended[0], blended[1], blended[2]]);
    }
    const fromNumber = /^(-?(?:\d+|\d*\.\d+))([a-z%]*)$/i.exec(String(from || '').trim());
    const toNumber = /^(-?(?:\d+|\d*\.\d+))([a-z%]*)$/i.exec(String(to || '').trim());
    if (fromNumber && toNumber && fromNumber[2] === toNumber[2]) {
        return `${Number(fromNumber[1]) + (Number(toNumber[1]) - Number(fromNumber[1])) * progress}${fromNumber[2]}`;
    }
    return progress < 0.5 ? from : to;
}

function sampleKeyframes(frames: ConsoleKeyframe[], progress: number): Record<string, string> {
    if (!frames.length) return {};
    const p = Math.max(0, Math.min(1, progress));
    if (p <= frames[0].offset) return { ...frames[0].declarations };
    if (p >= frames[frames.length - 1].offset) return { ...frames[frames.length - 1].declarations };
    for (let index = 0; index < frames.length - 1; index++) {
        const left = frames[index];
        const right = frames[index + 1];
        if (p < left.offset || p > right.offset) continue;
        const span = right.offset - left.offset;
        const local = span > 0 ? (p - left.offset) / span : 1;
        const eased = timingEase(local, 'linear');
        const declarations: Record<string, string> = {};
        for (const key of new Set([...Object.keys(left.declarations), ...Object.keys(right.declarations)])) {
            const from = left.declarations[key];
            const to = right.declarations[key];
            declarations[key] = from == null ? to : to == null ? from : interpolateValue(from, to, eased);
        }
        return declarations;
    }
    return {};
}

/** Sample one animation at `elapsedMs`, matching the CSS animation model. */
export function resolveConsoleAnimationFrame(
    spec: ConsoleAnimationSpec,
    frames: ConsoleKeyframe[],
    elapsedMs: number
): ConsoleAnimationFrame {
    if (!frames.length || spec.playState === 'paused' || spec.iterationCount === 0) {
        return { running: false };
    }
    const duration = Math.max(0, spec.durationMs);
    const activeTime = elapsedMs - spec.delayMs;
    const total = Number.isFinite(spec.iterationCount) ? duration * spec.iterationCount : Infinity;
    if (activeTime < 0) {
        const backward = spec.fillMode === 'backwards' || spec.fillMode === 'both';
        return {
            declarations: backward
                ? sampleKeyframes(frames, directionProgress(0, spec.direction, 0))
                : undefined,
            running: true
        };
    }
    if (duration <= 0 || activeTime >= total) {
        const fill = spec.fillMode === 'forwards' || spec.fillMode === 'both';
        const iteration = Number.isFinite(spec.iterationCount) ? Math.max(0, Math.floor(spec.iterationCount - 1)) : 0;
        return {
            declarations: fill
                ? sampleKeyframes(frames, directionProgress(1, spec.direction, iteration))
                : undefined,
            running: false
        };
    }
    const raw = activeTime / duration;
    const iteration = Math.floor(raw);
    const progress = raw - iteration;
    const eased = timingEase(progress, spec.timingFunction);
    return {
        declarations: sampleKeyframes(frames, directionProgress(eased, spec.direction, iteration)),
        running: true
    };
}
