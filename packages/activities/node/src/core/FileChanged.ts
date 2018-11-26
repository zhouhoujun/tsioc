import { Src } from '@taskfr/core';

/**
 * file changed.
 *
 * @export
 * @interface IFileChanged
 */
export interface IFileChanged {
    added: string[];
    updated: string[];
    removed: string[];
    changed?(): string[]
}

/**
 * files changed.
 *
 * @export
 * @interface FileChanged
 */
export class FileChanged implements IFileChanged {
    added: string[];
    updated: string[];
    removed: string[];
    constructor(public watch: Src) {
        this.added = [];
        this.updated = [];
        this.removed = [];
    }

    /**
     * all changed.
     *
     * @returns {string []}
     * @memberof FileChanged
     */
    changed(): string[] {
        return this.added.concat(this.updated, this.removed);
    }
}
