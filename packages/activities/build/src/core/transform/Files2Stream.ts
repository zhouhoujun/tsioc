import { Translator } from '@taskfr/core';
import { FileChanged } from '@taskfr/node';
import { ITransform } from './ITransform';
import { src } from 'vinyl-fs';
import { Injectable, InjectToken } from '@ts-ioc/core';

/**
 * files to stream token.
 */
export const Files2StreamToken = new InjectToken<Files2StreamTranslator>('Files2Stream');

/**
 * File to stream translator.
 *
 * @export
 * @class Files2StreamTranslator
 * @extends {Translator<FileChanged, ITransform>}
 */
@Injectable(Files2StreamToken)
export class Files2StreamTranslator extends Translator<FileChanged, ITransform> {
    /**
     * translate.
     *
     * @param {FileChanged} target
     * @returns {ITransform}
     * @memberof Files2StreamTranslator
     */
    translate(target: FileChanged): ITransform {
        let chg = target as FileChanged;
        if (chg.removed.length) {
            return src(chg.watch);
        } else {
            let srcs = chg.changed();
            if (srcs.length) {
                return src(srcs);
            }
        }
        return null;
    }
}
