/** Sectioned stylesheet for the visual workflow designer. */
import { WORKFLOW_DESIGNER_BASE_CSS } from './workflow-designer.styles.base';
import { WORKFLOW_DESIGNER_PUBLISH_CSS } from './workflow-designer.styles.publish';
import { WORKFLOW_DESIGNER_PANELS_CSS } from './workflow-designer.styles.panels';
import { WORKFLOW_DESIGNER_CANVAS_CSS } from './workflow-designer.styles.canvas';
import { WORKFLOW_DESIGNER_INSPECTOR_CSS } from './workflow-designer.styles.inspector';
import { WORKFLOW_DESIGNER_STATUS_CSS } from './workflow-designer.styles.status';
import { WORKFLOW_DESIGNER_THEME_CSS } from './workflow-designer.styles.theme';
import { WORKFLOW_DESIGNER_INTERACTION_CSS } from './workflow-designer.styles.interaction';

export const WORKFLOW_DESIGNER_STYLE_ID = 'tsdi-workflow-designer-styles';

/**
 * Stylesheet for the visual workflow designer, assembled from section modules
 * so each theme/panel family stays reviewable on its own.
 */
export const WORKFLOW_DESIGNER_CSS = [
    WORKFLOW_DESIGNER_BASE_CSS,
    WORKFLOW_DESIGNER_PUBLISH_CSS,
    WORKFLOW_DESIGNER_PANELS_CSS,
    WORKFLOW_DESIGNER_CANVAS_CSS,
    WORKFLOW_DESIGNER_INSPECTOR_CSS,
    WORKFLOW_DESIGNER_STATUS_CSS,
    WORKFLOW_DESIGNER_THEME_CSS,
    WORKFLOW_DESIGNER_INTERACTION_CSS
].join('\n');

/**
 * Install the designer stylesheet once per document. Safe to call from any
 * renderer; non-DOM hosts simply receive `undefined`.
 */
export function installWorkflowDesignerStyles(doc?: Document | null): void {
    if (!doc || typeof doc.createElement !== 'function' || !doc.head) {
        return;
    }
    if (doc.getElementById && doc.getElementById(WORKFLOW_DESIGNER_STYLE_ID)) {
        return;
    }
    const style = doc.createElement('style');
    style.setAttribute('id', WORKFLOW_DESIGNER_STYLE_ID);
    style.textContent = WORKFLOW_DESIGNER_CSS;
    doc.head.appendChild(style);
}
