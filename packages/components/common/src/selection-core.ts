/** Minimal option shape required for roving selection. */
export interface SelectionCandidate {
    disabled?: boolean;
}

/**
 * Shared roving-selection math for flat listbox/combobox surfaces.
 *
 * State stays on the owning component (so reactive bindings keep working); the
 * core only resolves the active index, skips disabled entries and wraps around
 * the ends. Keep it renderer-neutral: DOM and TUI use the same rules.
 */
export class SelectionCore {
    /** Enabled entries in document order. */
    protected enabledIndexes<T extends SelectionCandidate>(options: readonly T[]): number[] {
        const result: number[] = [];
        const list = Array.isArray(options) ? options : [];
        for (let index = 0; index < list.length; index++) {
            if (!list[index]?.disabled) {
                result.push(index);
            }
        }
        return result;
    }

    /** Preferred index when enabled, otherwise the first enabled index (-1 when none). */
    resolve<T extends SelectionCandidate>(options: readonly T[], preferredIndex: number): number {
        const list = Array.isArray(options) ? options : [];
        const preferred = Math.floor(Number(preferredIndex));
        if (Number.isFinite(preferred) && preferred >= 0 && preferred < list.length && !list[preferred]?.disabled) {
            return preferred;
        }
        return this.first(list);
    }

    first<T extends SelectionCandidate>(options: readonly T[]): number {
        const enabled = this.enabledIndexes(options);
        return enabled.length ? enabled[0] : -1;
    }

    last<T extends SelectionCandidate>(options: readonly T[]): number {
        const enabled = this.enabledIndexes(options);
        return enabled.length ? enabled[enabled.length - 1] : -1;
    }

    /**
     * Move `delta` enabled rows from `currentIndex`, wrapping at both ends.
     * With no active index, forward starts at the first row and backward at the last.
     */
    move<T extends SelectionCandidate>(options: readonly T[], currentIndex: number, delta: number): number {
        const enabled = this.enabledIndexes(options);
        if (!enabled.length || !delta) {
            return -1;
        }
        const current = enabled.indexOf(currentIndex);
        if (current < 0) {
            return delta > 0 ? enabled[0] : enabled[enabled.length - 1];
        }
        const next = ((current + delta) % enabled.length + enabled.length) % enabled.length;
        return enabled[next];
    }
}

/** Stateless shared instance for components that only need the algorithms. */
export const selectionCore = new SelectionCore();
