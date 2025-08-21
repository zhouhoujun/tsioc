export interface Node {
    nodeType: number;
    parentNode: Node | null;
    childNodes: Node[];
    textContent: string | null;
}
