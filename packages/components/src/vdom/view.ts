
/**
 * Explicitly marks `View` as a specific type in `ngDevMode`
 *
 * It is useful to know conceptually what time of `View` we are dealing with when
 * debugging an application (even if the runtime does not need it.) For this reason
 * we store this information in the `ngDevMode` `View` and than use it for
 * better debugging experience.
 */
export const enum ViewType {
    /**
     * Root `View` is the used to bootstrap components into. It is used in conjunction with
     * `LView` which takes an existing DOM node not owned by Angular and wraps it in `View`/``
     * so that other components can be loaded into it.
     */
    Root = 0,

    /**
     * `View` associated with a Component. This would be the `View` directly associated with the
     * component view (as opposed an `Embedded` `View` which would be a child of `Component` `View`)
     */
    Component = 1,

    /**
     * `View` associated with a template. Such as `*if`, `<v-template>` etc... A `Component`
     * can have zero or more `Embedede` `View`s.
     */
    Embedded = 2,
}
  
/**
 * The static data for an LView (shared between all templates of a
 * given type).
 *
 */
export interface IView {
    /**
     * Type of `View` (`Root`|`Component`|`Embedded`).
     */
    type: ViewType;
    
}
