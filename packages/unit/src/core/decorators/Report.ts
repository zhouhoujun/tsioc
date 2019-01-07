import { ClassMetadata, ITypeDecorator, createClassDecorator } from '@ts-ioc/core';

/**
 * report decorator
 *
 * @export
 * @interface IReportDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IReportDecorator<T extends ClassMetadata> extends ITypeDecorator<T> {

}

/**
 * report decorator. define class as report.
 */
export const Report: IReportDecorator<ClassMetadata> = createClassDecorator('Report');
