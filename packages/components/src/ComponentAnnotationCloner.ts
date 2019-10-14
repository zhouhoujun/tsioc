import { Singleton, isArray, isFunction, isMetadataObject, lang, isBaseValue } from '@tsdi/ioc';
import { ModuleConfigure, AnnotationCloner } from '@tsdi/boot';

/**
 * Component annotation metadata cloner
 *
 * @export
 * @class ComponentAnnotationCloner
 * @extends {AnnotationCloner}
 */
@Singleton()
export class ComponentAnnotationCloner extends AnnotationCloner {
    clone(ann: ModuleConfigure): ModuleConfigure {
        if (ann.template) {
            ann.template = this.cloneTemplate(ann.template);
        }
        return ann;
    }

    cloneTemplate(target: any) {
        if (isArray(target)) {
            return target.map(it => this.cloneTemplate(it));
        }
        if (isFunction(target)) {
            return target;
        } else if (isMetadataObject(target)) {
            let newM = {};
            lang.forIn(target, (val, name) => {
                newM[name] = this.cloneTemplate(val)
            });
            return newM;
        } else if (isBaseValue(target)) {
            return target;
        }
        return null;
    }
}
