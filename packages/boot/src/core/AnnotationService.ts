import {
    Singleton, Inject, lang, DecoratorProvider, ClassType, TypeReflects, DesignDecoratorRegisterer, DecoratorScopes
} from '@tsdi/ioc';
import { ModuleConfigure } from './modules';
import { AnnotationServiceToken, IAnnotationService } from './IAnnotationService';
import { AnnoationDesignAction } from './registers/AnnoationDesignAction';
import { AnnotationMerger } from './AnnotationMerger';


@Singleton(AnnotationServiceToken)
export class AnnotationService implements IAnnotationService {

    @Inject() reflects: TypeReflects;
    @Inject() decProvider: DecoratorProvider;
    @Inject() register: DesignDecoratorRegisterer;


    getDecorator(type: ClassType) {
        let dec = this.reflects.getDecorators(type, 'class')
            .find(d => this.register.has(d, DecoratorScopes.Class, AnnoationDesignAction));
        return dec;
    }

    getAnnoation(type: ClassType, decorator?: string): ModuleConfigure {
        if (!decorator) {
            decorator = this.getDecorator(type);
        }
        let annos = this.reflects.getMetadata<ModuleConfigure>(decorator, type);
        if (this.decProvider.has(decorator, AnnotationMerger)) {
            return this.decProvider.resolve(decorator, AnnotationMerger).merge(annos);
        } else {
            return { ...lang.first(annos) };
        }
    }
}
