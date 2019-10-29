import { InjectToken, ClassType } from '@tsdi/ioc';
import { ModuleConfigure } from './modules';

/**
 * annoation metadata service
 *
 * @export
 * @interface IAnnotationService
 */
export interface IAnnotationService {
    /**
     * get annoation decorator.
     *
     * @param {ClassType} type
     * @returns {string}
     * @memberof IAnnotationService
     */
    getDecorator(type: ClassType): string;
    /**
     * get annoation metadata.
     *
     * @param {ClassType} type
     * @param {string} [decorator]
     * @returns {ModuleConfigure}
     * @memberof IAnnotationService
     */
    getAnnoation(type: ClassType, decorator?: string): ModuleConfigure;
}

/**
 *  annotation service.
 */
export const AnnotationServiceToken = new InjectToken<IAnnotationService>('IAnnotationService');
