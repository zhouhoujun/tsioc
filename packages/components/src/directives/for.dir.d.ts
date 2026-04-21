import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
/**
 * v-for directive component with enhanced iterator support and elegant variable naming.
 * Combines best practices from Angular and Vue.
 *
 * @export
 * @class VForDirective
 */
export declare class VForDirective {
    private viewContainer;
    private _viewRefs;
    private _collection;
    private _prevCollection;
    private _itemNames;
    private _templateRef;
    private _effect;
    private _context;
    private _trackByFn;
    constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef<any>);
    set itemNames(names: string[]);
    set template(templateRef: TemplateRef<any>);
    set for(value: any);
    set context(ctx: any);
    set trackBy(trackByExpr: string);
    private isIterable;
    private createTrackByFunction;
    private updateView;
    private updateIterableView;
    private updateArrayView;
    private updateMapView;
    private updateSetView;
    private updateObjectView;
    private createContext;
    private setUserDefinedVariables;
    private updateViewsWithTrackBy;
    private collectionEquals;
    private createView;
    private clear;
    onInit(): void;
    onDestroy(): void;
    onChanges(): void;
}
