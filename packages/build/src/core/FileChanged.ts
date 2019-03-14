import { Src, Translator } from '@ts-ioc/activities';
import { Injectable } from '@ts-ioc/ioc';
import * as globby from 'globby';

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
}



@Injectable
export class FileChangedTranslator extends Translator<FileChanged, Promise<string[]>> {

    async translate(target: FileChanged): Promise<string[]> {
        if (target.removed.length) {
            return await globby(target.watch);
        } else {
            return target.added.concat(target.updated);
        }
    }
}
