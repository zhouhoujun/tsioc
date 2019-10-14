import {
    Singleton, Inject, lang, DecoratorProvider, ClassType, TypeReflects, DesignDecoratorRegisterer, DecoratorScopes
} from '@tsdi/ioc';
import { ModuleConfigure, IModuleReflect } from './modules';
import { AnnotationServiceToken, IAnnotationService } from './IAnnotationService';
import { AnnoationDesignAction } from './registers/AnnoationDesignAction';
import { AnnotationMerger } from './AnnotationMerger';
import { AnnotationCloner } from './AnnotationCloner';


/**
 * annotation service.
 *
 * @export
 * @class AnnotationService
 * @implements {IAnnotationService}
 */
@Singleton(AnnotationServiceToken)
export class AnnotationService implements IAnnotationService {

    @Inject() reflects: TypeReflects;
    @Inject() decProvider: DecoratorProvider;
    @Inject() register: DesignDecoratorRegisterer;


    getDecorator(type: ClassType) {
        let reft = this.reflects.get<IModuleReflect>(type);
        let keys: string[];
        if (reft && reft.annoDecoractor) {
            return reft.annoDecoractor;
        } else if (reft && reft.decorators.design) {
            keys = reft.decorators.design.classDecors;
        } else {
            keys = this.reflects.getDecorators(type, 'class');
        }

        return keys.find(d => this.register.has(d, DecoratorScopes.Class, AnnoationDesignAction));
    }

    getAnnoation(type: ClassType, decorator?: string): ModuleConfigure {
        let reft = this.reflects.get<IModuleReflect>(type);
        if (reft) {
            return reft.getAnnoation ? reft.getAnnoation() : {};
        }
        if (!decorator) {
            decorator = this.getDecorator(type);
        }
        let annos = this.reflects.getMetadata<ModuleConfigure>(decorator, type);
        let merger = this.decProvider.resolve(decorator, AnnotationMerger);
        let merged = merger ? merger.merge(annos) : lang.first(annos);
        reft = this.reflects.create(type, <IModuleReflect>{
            annoDecoractor: decorator,
            baseURL: merged.baseURL,
            getAnnoation: () => {
                let annon = { ...merged };
                let cloner = this.decProvider.resolve(decorator, AnnotationCloner);
                if (cloner) {
                    annon = cloner.clone(annon);
                }
                return annon;
            }
        });
        return reft.getAnnoation();
    }
}
