import * as React from "react";
import * as PDFJS from "pdfjs-dist";
import { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

import { AnnotationData } from "../../interfaces/AnnotationData";
import { NotationData } from "../../interfaces/NotationData";
import { PDFNotationAnnotation, ImportedPDFNotationAnnotation, PDFNotationAnnotationProps, ImportedPDFNotationAnnotationProps } from "./PDFNotation";
import { PDFPageHighlightAnnotation, ImportedPDFPageHighlightAnnotation, PDFPageHighlightAnnotationProps, ImportedPDFPageHighlightAnnotationProps } from "../AnnotatorComponents/PDFHighlights";

import "./PDFSinglePage.css";
import { ImportedPDFPageComment, PDFPageComment } from "./PDFComment";


interface PDFPageProps {
    page: PDFJS.PDFPageProxy;
    zoomScale: number;
    pageID: string;

    highlightModeIsEnabled: boolean;
    commentModeIsEnabled: boolean;

    annotationColor: string,
}

interface PDFPageState {
    viewport: PDFJS.PageViewport | null;

    textLayerElements: JSX.Element[];

    annotationLayerElements: JSX.Element[];
    annotationLayerElementRefs: (React.RefObject<PDFPageHighlightAnnotation> | React.RefObject<ImportedPDFPageHighlightAnnotation>)[];
    notationSectionElements: JSX.Element[];
    notationSectionElementRefs: (React.RefObject<PDFNotationAnnotation> | React.RefObject<ImportedPDFNotationAnnotation>)[];

    comments: (PDFPageComment | ImportedPDFPageComment)[],

    isHighlighting: boolean;
    isCommenting: boolean;

    annotationColor: string;
}

class PDFPage extends React.Component<PDFPageProps, PDFPageState> {
    private pdfTextWidthPreviewer: React.RefObject<HTMLDivElement>;
    private pdfContainer: React.RefObject<HTMLDivElement>;
    private pdfCanvas: React.RefObject<HTMLCanvasElement>;
    private pdfAnnotationsLayer: React.RefObject<HTMLDivElement>;
    private pdfTextLayer: React.RefObject<HTMLDivElement>;
    private pdfCommentSection: React.RefObject<HTMLDivElement>;

    private page: PDFJS.PDFPageProxy;
    private zoomScale: number;

    private highlightListenerInstance: () => void;
    private commentListenerInstance: () => void;

    constructor(props: PDFPageProps) {
        super(props);
        this.pdfTextWidthPreviewer = React.createRef<HTMLDivElement>();
        this.pdfContainer = React.createRef<HTMLDivElement>();
        this.pdfCanvas = React.createRef<HTMLCanvasElement>();
        this.pdfAnnotationsLayer = React.createRef<HTMLDivElement>();
        this.pdfTextLayer = React.createRef<HTMLDivElement>();
        this.pdfCommentSection = React.createRef<HTMLDivElement>();

        this.page = props.page;
        this.zoomScale = props.zoomScale;

        // We create a instance of the highlight function so we can use this to add and or remove listener events
        this.highlightListenerInstance = this.highlightSelectedText.bind(this);
        this.commentListenerInstance = this.commentSelectedText.bind(this);

        this.state = {
            viewport: null,
            textLayerElements: [],

            annotationLayerElements: [],
            annotationLayerElementRefs: [],
            notationSectionElements: [],
            notationSectionElementRefs: [],
            
            comments: [],

            isHighlighting: props.highlightModeIsEnabled,
            isCommenting: props.commentModeIsEnabled,

            annotationColor: props.annotationColor
        }
    }

    // Functions regarding intiailization and startup

    private measureText(str: string, fontSize: number, fontFamily: string): number { // Returns pixel width of text
        const textWidthPreview: HTMLDivElement = this.pdfTextWidthPreviewer.current as HTMLDivElement;
        textWidthPreview.textContent = str;
        textWidthPreview.style.fontSize = `${fontSize}px`;
        textWidthPreview.style.fontFamily = fontFamily;

        return textWidthPreview.offsetWidth;
    }

    private async renderPage(): Promise<void> {
        // Math page size to pdf size
        const scale = this.zoomScale;
        const viewport: PDFJS.PageViewport = this.page.getViewport({ scale: scale });
        const container: HTMLDivElement = this.pdfContainer.current as HTMLDivElement;
        const canvas: HTMLCanvasElement = this.pdfCanvas.current as HTMLCanvasElement;
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
        const annotationsLayer: HTMLDivElement = this.pdfAnnotationsLayer.current as HTMLDivElement;
        const textLayer: HTMLDivElement = this.pdfTextLayer.current as HTMLDivElement;
        const pdfCommentSection: HTMLDivElement = this.pdfCommentSection.current as HTMLDivElement;

        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;
        container.style.marginLeft = `${(Math.max((window.innerWidth - viewport.width) / 2, 0))}px`

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        annotationsLayer.style.width = `${viewport.width}px`;
        annotationsLayer.style.height = `${viewport.height}px`;

        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        pdfCommentSection.style.height = `${viewport.height}px`;

        // Render pdf page drawing
        await this.page.render({
            canvasContext: ctx as CanvasRenderingContext2D,
            viewport: viewport
        }).promise;

        // Now grab and render pdf page and text content
        // First we render the page, then the text layer
        const textLayerElements: JSX.Element[] = [];
        const textContent: TextContent = await this.page.getTextContent();

        for (let i = 0; i < textContent.items.length; i++) {
            const textItem: TextItem = textContent.items[i] as TextItem;
            const fontSize: number = Math.sqrt(textItem.transform[0]**2 + textItem.transform[1]**2) * scale;
            const leftOffset: number = (textItem.transform[4] / canvas.width) * 100 * scale;
            const topOffset: number = (((canvas.height) - (textItem.transform[5] * scale) - (textItem.height * scale)) / canvas.height) * 100;
            const textLayerWidth: number = this.measureText(textItem.str, fontSize, textContent.styles[textItem.fontName].fontFamily);
            const textLayerItem: React.ReactNode = React.createElement("span", {
                style: {
                    fontFamily: textContent.styles[textItem.fontName].fontFamily,
                    fontSize: `${fontSize}px`,
                    left: leftOffset + '%',
                    top: topOffset + '%',
                    width: textItem.width * scale,
                    height: textItem.height * scale,
                    position: "absolute",
                    whiteSpace: "pre",
                    cursor: "text",
                    transformOrigin: "0% 0%",
                    transform: `scaleX(${(textItem.width * scale) / textLayerWidth})`,
                    color: "transparent",
                    // backgroundColor: "rgba(205, 255, 178, 0.443)",
                },
                key: Math.random()
            }, textItem.str);

            textLayerElements.push(textLayerItem);
        }

        // Now render text layer
        this.setState({ textLayerElements: textLayerElements, viewport: viewport });
    }

    private async initialize(): Promise<void> {
        await this.renderPage();
        this.configureModesOnStartup();
    }

    // Functions regarding the alive state

    private resizeHighlightedTextAnnotations(scaleRatio: number): void {
        for (let i = 0; i < this.state.annotationLayerElementRefs.length; i++) {
            const annotation: (React.RefObject<PDFPageHighlightAnnotation> | React.RefObject<ImportedPDFPageHighlightAnnotation>) = this.state.annotationLayerElementRefs[i];
            annotation.current?.resize(scaleRatio);
        }
    }

    private removeHighlightedTextAnnotation(identifier: number | string): void {
        // Filter out the annotation with the matching key
        const newHighlightAnnotations = this.state.annotationLayerElements.filter(
            (annotation: JSX.Element) => annotation?.props.identifier !== identifier
        );

        const newHighlightAnnotationRefs = this.state.annotationLayerElementRefs.filter(
            (_ref, index) => this.state.annotationLayerElements[index]?.props.identifier !== identifier
        );

        this.setState({ annotationLayerElements: newHighlightAnnotations, annotationLayerElementRefs: newHighlightAnnotationRefs });
    }

    private highlightSelectedText(): void {
        const selection: Selection | null = window.getSelection();

        if (!selection || selection.toString().length <= 0) {
            return;
        }

        const range: Range = selection.getRangeAt(0);

        // Create new highlighted annotation with the given range, making sure to store its ref
        const newHighlightAnnotationRef: React.RefObject<PDFPageHighlightAnnotation> =  React.createRef<PDFPageHighlightAnnotation>();
        const newHighlightAnnotation: JSX.Element = (<PDFPageHighlightAnnotation range={range} highlightColor={this.state.annotationColor} onRemove={this.removeHighlightedTextAnnotation.bind(this)} identifier={Math.random()} ref={newHighlightAnnotationRef} key={Math.random()}></PDFPageHighlightAnnotation>)
        
        this.setState({ 
            annotationLayerElements: [...this.state.annotationLayerElements, newHighlightAnnotation], 
            annotationLayerElementRefs: [...this.state.annotationLayerElementRefs, newHighlightAnnotationRef] 
        });
    }

    private removeCommentAnnotation(identifier: number | string): void {
        // Filter out the comment annotation with the matching key
        const newHighlightAnnotations = this.state.annotationLayerElements.filter(
            (annotation: JSX.Element) => annotation?.props.identifier !== identifier
        );

        const newAnnotationRefs = this.state.annotationLayerElementRefs.filter(
            (_ref, index) => this.state.annotationLayerElements[index]?.props.identifier !== identifier
        );

        const newNotationAnnotations = this.state.notationSectionElements.filter(
            (annotation: JSX.Element) => annotation?.props.identifier !== identifier
        );

        const newNotationAnnotationRefs = this.state.notationSectionElementRefs.filter(
            (_ref, index) => this.state.annotationLayerElements[index]?.props.identifier !== identifier
        );

        const newComments = this.state.comments.filter(
            (comment: (PDFPageComment | ImportedPDFPageComment)) => comment.identifier !== identifier
        )

        this.setState({ 
            annotationLayerElements: newHighlightAnnotations, 
            annotationLayerElementRefs: newAnnotationRefs,
            notationSectionElements: newNotationAnnotations,
            notationSectionElementRefs: newNotationAnnotationRefs,
            comments: newComments
        }, () => console.log(this.state));
    }

    private commentSelectedText(): void { // WORK HERE
        const selection: Selection | null = window.getSelection();

        if (!selection) {
            return;
        }

        const textSelected: string = selection.toString();

        if (textSelected.length == 0) {
            return;
        }

        // OVER HERE - CREATE A COMMENT INSTEAD AND THEN PUT ITS COMPONENTS INTO THE STATE!
        // OKAY NOW THAT THE COMMENT OBJECT IS CREATED AND WORKS FINE -> THE HIGHLIGHT AND notation are linked!
        // Just finish the code to link the two colors and stuff like that!

        const range: Range = selection.getRangeAt(0);
        const identifier: number = Math.random();

        // // Create new highlighted annotation with the given range of the comment, making sure to store its ref
        // const newHighlightAnnotationRef: React.RefObject<PDFPageHighlightAnnotation> =  React.createRef<PDFPageHighlightAnnotation>();
        // const newHighlightAnnotation: JSX.Element = (<PDFPageHighlightAnnotation highlightColor={this.state.annotationColor} range={range} onRemove={this.removeCommentAnnotation.bind(this)} identifier={identifier} ref={newHighlightAnnotationRef} key={Math.random()}></PDFPageHighlightAnnotation>)
        
        // // Create new comment
        // const newCommentAnnotationRef: React.RefObject<PDFNotationAnnotation> = React.createRef<PDFNotationAnnotation>();
        // const newCommentAnnotation: JSX.Element = (<PDFNotationAnnotation matchingColor={this.state.annotationColor} identifier={identifier} textCommented={textSelected} onRemove={this.removeCommentAnnotation.bind(this)} ref={newCommentAnnotationRef} key={Math.random()}></PDFNotationAnnotation>);

        // this.setState({ 
        //     annotationLayerElements: [...this.state.annotationLayerElements, newHighlightAnnotation], 
        //     annotationLayerElementRefs: [...this.state.annotationLayerElementRefs, newHighlightAnnotationRef],
        //     commentSectionElements: [...this.state.commentSectionElements, newCommentAnnotation],
        //     commentSectionElementRefs: [...this.state.commentSectionElementRefs, newCommentAnnotationRef]
        // });

        // Create new comment consisting of a highlight and notation
        const highlightProps: PDFPageHighlightAnnotationProps = {
            highlightColor: this.state.annotationColor,
            range: range,
            onRemove: this.removeCommentAnnotation.bind(this),
            identifier: identifier
        }

        const notationProps: PDFNotationAnnotationProps= {
            identifier: identifier,
            matchingColor: this.state.annotationColor,
            textCommented: textSelected,
            onRemove: this.removeCommentAnnotation.bind(this)
        }

        const newComment = new PDFPageComment({PDFHighlightProps: highlightProps, PDFNotationProps: notationProps, identifier: identifier})

        // Add the notation and highlight of the comment:
        this.setState({
            annotationLayerElements: [...this.state.annotationLayerElements, newComment.PDFCommentHighlightElement], 
            annotationLayerElementRefs: [...this.state.annotationLayerElementRefs, newComment.PDFCommentHighlightRef],
            notationSectionElements: [...this.state.notationSectionElements, newComment.PDFCommentNotationElement],
            notationSectionElementRefs: [...this.state.notationSectionElementRefs, newComment.PDFCommentNotationRef],
            comments: [...this.state.comments, newComment]
        })
    }

    private configureModesOnStartup(): void {
        // On startup, if we are supposed highlight, then start highlighting!
        if (this.state.isHighlighting) {
            this.pdfTextLayer.current?.addEventListener("mouseup", this.highlightListenerInstance);
        }

        if (this.state.isCommenting) {
            this.pdfTextLayer.current?.addEventListener("mouseup", this.commentListenerInstance);
        }
    }

    public changeAnnotationHighlightColor(newColor: string): void {
        // Set future annotations to the new color
        this.setState({ annotationColor: newColor });
    }

    public toggleHighlightMode(): void {
        this.setState({ isHighlighting: !this.state.isHighlighting }, () => {
            if (this.state.isHighlighting) {
                this.pdfTextLayer.current?.addEventListener("mouseup", this.highlightListenerInstance);
            } else {
                this.pdfTextLayer.current?.removeEventListener("mouseup", this.highlightListenerInstance);
            }
        });
    }

    public toggleCommentMode(): void {
        this.setState({ isCommenting: !this.state.isCommenting }, () => {
            if (this.state.isCommenting) {
                this.pdfTextLayer.current?.addEventListener("mouseup", this.commentListenerInstance);
            } else {
                this.pdfTextLayer.current?.removeEventListener("mouseup", this.commentListenerInstance);
            }
        })
    }

    public async importHighlightedTextAnnotationFromData(highlightAnnotationData: AnnotationData): Promise<void> {
        // Create new highlighted annotation with the given data, making sure to store its ref
        const newImportedHighlightAnnotationRef: React.RefObject<ImportedPDFPageHighlightAnnotation> =  React.createRef<ImportedPDFPageHighlightAnnotation>();
        const newImportedHighlightAnnotation: JSX.Element = (<ImportedPDFPageHighlightAnnotation highlightData={highlightAnnotationData} onRemove={this.removeHighlightedTextAnnotation.bind(this)} identifier={highlightAnnotationData.identifier} ref={newImportedHighlightAnnotationRef} key={Math.random()}></ImportedPDFPageHighlightAnnotation>)
        
        return new Promise<void>((resolve) => {
            this.setState({ 
                annotationLayerElements: [...this.state.annotationLayerElements, newImportedHighlightAnnotation], 
                annotationLayerElementRefs: [...this.state.annotationLayerElementRefs, newImportedHighlightAnnotationRef] 
            }, () => resolve());
        })
    }

    public async importCommentFromData(notationData: NotationData, annotationData: AnnotationData): Promise<void> {
        // Create new comment consisting of a highlight and notation
        const highlightProps: ImportedPDFPageHighlightAnnotationProps = {
            identifier: annotationData.identifier,
            highlightData: annotationData,
            onRemove: this.removeCommentAnnotation.bind(this)
        }

        const notationProps: ImportedPDFNotationAnnotationProps = {
            identifier: notationData.identifier,
            commentData: notationData,
            onRemove: this.removeCommentAnnotation.bind(this)
        }

        const newComment = new ImportedPDFPageComment({PDFHighlightProps: highlightProps, PDFNotationProps: notationProps, identifier: annotationData.identifier})
        
        return new Promise<void> ((resolve) => {
            this.setState({
                annotationLayerElements: [...this.state.annotationLayerElements, newComment.PDFCommentHighlightElement], 
                annotationLayerElementRefs: [...this.state.annotationLayerElementRefs, newComment.PDFCommentHighlightRef],
                notationSectionElements: [...this.state.notationSectionElements, newComment.PDFCommentNotationElement],
                notationSectionElementRefs: [...this.state.notationSectionElementRefs, newComment.PDFCommentNotationRef],
                comments: [...this.state.comments, newComment]
            }, () => resolve())
        })
    }

    public recenterPage(): void {
        const scale = this.zoomScale;
        const viewport: PDFJS.PageViewport = this.page.getViewport({ scale: scale });
        const container: HTMLDivElement = this.pdfContainer.current as HTMLDivElement;
        const centeredMargin = Math.max((window.innerWidth - viewport.width) / 2, 0);

        container.style.marginLeft = `${centeredMargin}px`;
    }

    public scalePage(zoomPercentage: number): void {
        const scaleRatio = zoomPercentage / this.zoomScale;
        this.zoomScale = zoomPercentage;

        this.renderPage();
        this.resizeHighlightedTextAnnotations(scaleRatio);
    }

    // Functions regarding rendering

    public componentDidMount(): void {
        this.initialize();
    }

    public render(): React.ReactNode {
        return (
            <>
                <div className="pdf-page-text-width-preview" ref={this.pdfTextWidthPreviewer}>yessir</div>
                <div className="pdf-view-page-container" id={this.props.pageID}>
                    <div className="pdf-page-container" ref={this.pdfContainer}>
                        <canvas className="pdf-page-drawing-canvas" ref={this.pdfCanvas}></canvas>
                        <div className="pdf-page-annotations-layer" ref={this.pdfAnnotationsLayer}>
                            {this.state.annotationLayerElements}
                        </div>
                        <div className="pdf-page-textlayer" ref={this.pdfTextLayer}>
                            {this.state.textLayerElements}
                        </div>
                    </div>
                    <div className="pdf-page-comments-container" ref={this.pdfCommentSection}>
                        {this.state.notationSectionElements}
                    </div>
                </div>
            </>
        )
    }
}

export { PDFPage };