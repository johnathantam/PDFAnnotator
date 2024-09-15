export interface AnnotationData {
    pageNumber: number;
    identifier: string | number;
    clipPathId: string;
    clipPathPolygonPoints: string[];
    leftOffset: number;
    topOffset: number;
    toolbarLeftOffset: number;
    toolbarTopOffset: number;
    width: number;
    height: number;
    annotationColor: string;
}