import { MetadataExtends, createClassDecorator, isString, ITypeDecorator, isNumber, ArgsIteratorAction } from '@tsdi/ioc';
import { SuiteMetadata } from '../metadata/SuiteMetadata';
import { SuiteRunnerToken } from '../runner/ISuiteRunner';


/**
 * Suite decorator type define.
 *
 * @export
 * @interface ISuiteDecorator
 * @template T
 */
export interface ISuiteDecorator<T extends SuiteMetadata> extends ITypeDecorator<T> {
    /**
     * suite decorator.
     * @param {string} suite describe.
     */
    (describe?: string): ClassDecorator;
    /**
     * suite decorator.
     * @param {string} suite describe.
     * @param {number} timeout suite timeout.
     */
    (describe: string, timeout: number): ClassDecorator;
}

/**
 * create filed decorator.
 *
 * @export
 * @template T
 * @param {string} [SuiteType]
 * @param {ArgsIteratorAction<T>[]} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {IFiledDecorator<T>}
 */
export function createSuiteDecorator<T extends SuiteMetadata>(
    actions?: ArgsIteratorAction<T>[],
    metaExtends?: MetadataExtends<T>): ISuiteDecorator<T> {
    return createClassDecorator<SuiteMetadata>('Suite',
        [
            ...(actions || []),
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.describe = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isNumber(arg)) {
                    ctx.metadata.timeout = arg;
                    ctx.next(next);
                }
            }
        ],
        (metadata: T) => {
            if (metaExtends) {
                metaExtends(metadata);
            }
            metadata.singleton = true;
            metadata.defaultRunnable = SuiteRunnerToken;
            return metadata;
        }) as ISuiteDecorator<T>;
}

export const Suite: ISuiteDecorator<SuiteMetadata> = createSuiteDecorator<SuiteMetadata>();
