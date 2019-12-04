import {
    Singleton, Inject, lang, DecoratorProvider, ClassType,
    TypeReflects, DesignRegisterer, DecoratorScopes
} from '@tsdi/ioc';
import { IModuleReflect } from './modules/IModuleReflect';
import { ModuleConfigure } from './modules/ModuleConfigure';
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
    @Inject() register: DesignRegisterer;


    getDecorator(type: ClassType) {
        let reft = this.reflects.get<IModuleReflect>(type);
        let keys: string[];
        if (reft && reft.annoDecoractor) {
            return reft.annoDecoractor;
        } else if (reft && reft.decorators) {
            if (!reft.decorators.design.classDecors.length) {
                reft.decorators.reset();
            }
            keys = reft.decorators.design.classDecors;
        } else {
            keys = this.reflects.getDecorators(type);
        }
        return keys.find(d => this.register.has(d, DecoratorScopes.Class, AnnoationDesignAction));
    }

    getAnnoation(type: ClassType, decorator?: string): ModuleConfigure {
        let reft = this.reflects.get<IModuleReflect>(type);
        if (reft && reft.getAnnoation) {
            return reft.getAnnoation();
        }
        decorator = decorator || this.getDecorator(type);
        if (!decorator) {
            return null;
        }
        let annos = this.reflects.getMetadata<ModuleConfigure>(decorator, type);
        if (!annos.length) {
            return null;
        }
        let merger = this.decProvider.resolve(decorator, AnnotationMerger);
        let merged = merger ? merger.merge(annos) : lang.first(annos);
        let cloner: AnnotationCloner;
        let proder = this.decProvider;
        reft = this.reflects.create(type, <IModuleReflect>{
            decorator: decorator,
            annoDecoractor: decorator,
            baseURL: merged.baseURL,
            getAnnoation: () => {
                let annon = { ...merged };
                if (!cloner) {
                    cloner = proder.resolve(decorator, AnnotationCloner);
                }
                if (cloner) {
                    annon = cloner.clone(annon);
                }
                return annon;
            }
        });
        return reft.getAnnoation();
    }
}
