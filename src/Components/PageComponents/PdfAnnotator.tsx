import * as React from "react";

import * as PDFLib from "pdf-lib";
import * as PDFJS from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";

import { AnnotationData } from "../../interfaces/AnnotationData";
import { CommentData } from "../../interfaces/CommentData";
import { ImportedPDFPageCommentAnnotation, PDFPageCommentAnnotation } from "../AnnotatorComponents/PDFComments";
import { PDFPage } from "../AnnotatorComponents/PDFSinglePage";
import "./PdfAnnotator.css";

interface PDFViewerProps {
    pdfData: ArrayBuffer | undefined;
}

interface PDFViewerState {
    pdfData: ArrayBuffer | undefined;

    pdfDocument: PDFJS.PDFDocumentProxy | null;
    pdfPages: React.ReactNode[];
    pdfPageObjects: React.RefObject<PDFPage>[];

    zoomScale: number;

    highlightModeIsEnabled: boolean;
    commentModeIsEnabled: boolean;

    annotationColor: string;
}

interface SavedAnnotations {
    annotations: AnnotationData[],
    comments: CommentData[],
}

class PDFViewer extends React.Component<PDFViewerProps, PDFViewerState> {
    private pdfViewerContainer: React.RefObject<HTMLDivElement>;

    private pdfViewerToolbarHighlightButton: React.RefObject<HTMLButtonElement>;
    private pdfViewerToolbarCommentButton: React.RefObject<HTMLButtonElement>;
    private pdfViewerToolbarColorChoiceButtons: { 
        yellowChoice: React.RefObject<HTMLDivElement>, 
        purpleChoice: React.RefObject<HTMLDivElement>,
        greenChoice: React.RefObject<HTMLDivElement>,
        redChoice: React.RefObject<HTMLDivElement>,
        blueChoice: React.RefObject<HTMLDivElement>,
    };

    constructor(props: PDFViewerProps) {
        super(props);
        this.pdfViewerContainer = React.createRef<HTMLDivElement>();
        this.pdfViewerToolbarHighlightButton = React.createRef<HTMLButtonElement>();
        this.pdfViewerToolbarCommentButton = React.createRef<HTMLButtonElement>();
        this.pdfViewerToolbarColorChoiceButtons = {
            yellowChoice : React.createRef<HTMLDivElement>(), 
            purpleChoice: React.createRef<HTMLDivElement>(),
            greenChoice: React.createRef<HTMLDivElement>(),
            redChoice: React.createRef<HTMLDivElement>(),
            blueChoice: React.createRef<HTMLDivElement>(),
        }

        this.state = {
            pdfData: props.pdfData,
            pdfDocument: null,

            pdfPages: [],
            pdfPageObjects: [],

            zoomScale: 1,

            highlightModeIsEnabled: false,
            commentModeIsEnabled: false,

            annotationColor: "rgba(215, 255, 39, 0.548)"
        }
    }

    // Functions needed for loading the pdf viewer

    private async renderPDFPages(start: number, length: number): Promise<void> {
        if (this.state.pdfDocument == null) {
            return;
        }

        const numPages: number = this.state.pdfDocument.numPages as number;

        if (start > numPages) {
            return;
        }

        if (start + length > numPages) {
            length = numPages - start; // If the length goes over the amount of pages, adjust the length to cover the rest
        }

        const pages: React.ReactNode[] = this.state.pdfPages;
        const pageObjects: React.RefObject<PDFPage>[] = this.state.pdfPageObjects;

        for (let i = start; i < (start + length); i++) {
            const page: PDFJS.PDFPageProxy = await this.state.pdfDocument.getPage(i+1) as PDFJS.PDFPageProxy;
            const newPageObjectRef: React.RefObject<PDFPage> = React.createRef<PDFPage>();  // const newPage: React.ReactNode = React.createElement(PDFPage, {page: page, zoomScale: this.zoomScale, id: `${i}`, key: Math.random()});
            const newPage = (<PDFPage page={page} annotationColor={this.state.annotationColor} zoomScale={this.state.zoomScale} highlightModeIsEnabled={this.state.highlightModeIsEnabled} commentModeIsEnabled={this.state.commentModeIsEnabled} pageID={`${i}`} ref={newPageObjectRef} key={Math.random()}></PDFPage>)
            
            pages.push(newPage);
            pageObjects.push(newPageObjectRef);
        }

        return new Promise<void>((resolve) => {
            // Render new pdf pages
            this.setState({ pdfPages: pages, pdfPageObjects: pageObjects }, () => { 
                resolve();
            });
        })
    }

    private async loadPDFDocument(): Promise<PDFJS.PDFDocumentProxy> {
        // Set worker
        PDFJS.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";

        let loadingTask: PDFJS.PDFDocumentLoadingTask;

        if (this.state.pdfData !== undefined) {
            loadingTask = PDFJS.getDocument({
                data: this.state.pdfData.slice(0),
                enableXfa: true,
                disableAutoFetch: true,
                disableStream: true,
            });
        } else {
            const defaultData: ArrayBuffer = await fetch("./test/unte.pdf").then(res => res.arrayBuffer());
            // Load fallback / default pdf if no custom pdf data was given
            loadingTask = PDFJS.getDocument({
                data: defaultData.slice(0),
                enableXfa: true,
                disableAutoFetch: true,
                disableStream: true,
            });

            // Load data
            await new Promise((resolve) => {this.setState({ pdfData: defaultData }, () => resolve(0))});
        }
        
        // Wait for the PDF document to load and store it in a variable
        const pdfDocument: PDFJS.PDFDocumentProxy = await loadingTask.promise;

        return pdfDocument;
    }

    private async renderPDF(): Promise<void> {
        const pdfDocument = await this.loadPDFDocument();
        return new Promise<void>((resolve) => {
            this.setState({ pdfDocument: pdfDocument }, async () => {
                if (this.state.pdfDocument !== null) {
                    await this.renderPDFPages(0, 2);
                }

                resolve();
            })
        })
    }

    private async initialzeViewer(): Promise<void> {
        await this.renderPDF();

        // Turn on progressive loading
        this.pdfViewerContainer.current?.addEventListener("scroll", this.progressiveLoadOnScroll.bind(this));

        // Center pages on resize
        window.addEventListener("resize", () => this.recenterPages());
    }

    // Functions involving the alive state (loading new pages, etc)

    private async progressiveLoadOnScroll(): Promise<void> {
        const container: HTMLDivElement | null = this.pdfViewerContainer.current;
        const pdfDocument: PDFJS.PDFDocumentProxy | null = this.state.pdfDocument;

        if (!container || !pdfDocument) {
            return;
        }

        if (container.innerHTML.trim() === "") { // If the container is empty i.e when clearing the viewer, don't run!
            return;
        }

        const numPages: number = (pdfDocument.numPages - 1) as number;
        const numOfRenderedPages: number = this.state.pdfPages.length;
        const scrollTop: number = container.scrollTop;
        const scrollHeight: number = container.scrollHeight;
        const clientHeight: number = container.clientHeight;
        const scrollPercentage: number = (scrollTop + clientHeight) / scrollHeight;

        if (scrollPercentage > 0.8 && numOfRenderedPages <= numPages) {
            // Load the next set of pages when 80% scrolled
            await this.renderPDFPages(numOfRenderedPages, 2);
        }
    }

    private recenterPages(): void {
        this.state.pdfPageObjects.forEach((page: React.RefObject<PDFPage>) => page.current?.recenterPage());
    }

    private changeAnnotationColor(newColor: string, choiceColorButton: React.RefObject<HTMLDivElement>): void {
        this.setState({ annotationColor: newColor }, () => {
            // // Update the color within the program!
            this.state.pdfPageObjects.forEach((page: React.RefObject<PDFPage>) => {
                page.current?.changeAnnotationHighlightColor(newColor);
            })

            // Select the button on the front end, but start by deselecting all the others
            for (const [, buttonRef] of Object.entries(this.pdfViewerToolbarColorChoiceButtons)) {
                if (buttonRef.current) {
                    // Do something with buttonRef.current, e.g., remove a class
                    buttonRef.current.classList.remove('selected-pallete-color');
                }
            }

            // Now select the chosen button
            choiceColorButton.current?.classList.add("selected-pallete-color");
        })
    }

    private toggleHighlightMode(): void {
        // Make sure comment mode is not selected / and if so, we deselect
        if (this.state.commentModeIsEnabled) {
            this.toggleCommentMode(); // Turn comment mode off
        }

        // Turn on or off highlight mode for future pages and for all current pages
        this.setState({ highlightModeIsEnabled: !this.state.highlightModeIsEnabled }, () => {
            this.state.pdfPageObjects.forEach((page: React.RefObject<PDFPage>) => page.current?.toggleHighlightMode());
            // Stylize the button
            this.state.highlightModeIsEnabled ? this.pdfViewerToolbarHighlightButton.current?.classList.add("pdf-toolbar-item-is-selected") : this.pdfViewerToolbarHighlightButton.current?.classList.remove("pdf-toolbar-item-is-selected");
        })
    }

    private toggleCommentMode(): void {
        // Make sure highlight mode is not selected / and if so, we deselect
        if (this.state.highlightModeIsEnabled) {
            this.toggleHighlightMode(); // Turn highlight mode off
        }

        // Turn on or off highlight mode for future pages and for all current pages
        this.setState({ commentModeIsEnabled: !this.state.commentModeIsEnabled }, () => {
            this.state.pdfPageObjects.forEach((page: React.RefObject<PDFPage>) => page.current?.toggleCommentMode());
            // Stylize the button
            this.state.commentModeIsEnabled ? this.pdfViewerToolbarCommentButton.current?.classList.add("pdf-toolbar-item-is-selected") : this.pdfViewerToolbarCommentButton.current?.classList.remove("pdf-toolbar-item-is-selected");
        })
    }

    public getViewerContainer(): HTMLDivElement | null {
        const viewerContainer = this.pdfViewerContainer.current;

        if (!viewerContainer) {
            return null;
        }

        return viewerContainer;
    }

    public getTotalPageNumberOfPDF(): number | null {
        if (this.state.pdfDocument)  {
            return this.state.pdfDocument.numPages;
        }

        return null;
    }

    public getCurrentPageNumber(): number | null {
        const container = this.pdfViewerContainer.current;
        const examplePage = (this.state.pdfPageObjects.length > 0) ? this.state.pdfPageObjects[0] : null;

        if (!container || !examplePage) {
            return null;
        }

        // Calculate necessary dimensions
        const pageMarginTopPixels: number = (container.clientHeight * 2) / 100;
        const heightOfPagePixels: number | null | undefined = examplePage.current?.state.viewport?.height;
        const visibleTop = container.scrollTop;

        if (!heightOfPagePixels) {
            return null;
        }

        // Now calculate based on the height of the margin, the height of the page, and the pixels scrolled in the pdf container
        // to get the current visible page

        // Assuming pages are evenly spaced with the height of `heightOfPagePixels`
        const totalPageHeight = pageMarginTopPixels + heightOfPagePixels;
        const pageIndexTop = Math.floor(visibleTop / totalPageHeight); // The page on the top of the screen
        // (Here if we ever need the bottom page!) const pageIndexBottom = Math.floor(visibleBottom / totalPageHeight);

        return pageIndexTop;
    }

    public async travelToPage(page: number): Promise<void> {
        const pdfDocument: PDFJS.PDFDocumentProxy | null = this.state.pdfDocument;

        if (!pdfDocument) {
            return;
        }

        const numPages: number = (pdfDocument.numPages - 1) as number;
        const numRenderedPages: number = this.state.pdfPages.length;

        if (page > numPages) {
            page = numPages;
        }

        if (page > numRenderedPages) {
            // Render more pages till the page to scroll and 5 more
            await this.renderPDFPages(numRenderedPages, (page - numRenderedPages) + 5);
            document.getElementById(`${page}`)?.scrollIntoView()
            return;
        }

        // Scroll to view
        document.getElementById(`${page}`)?.scrollIntoView();
    }

    public zoom(magnifier: number): void {
        const zoomPercentage = this.state.zoomScale + magnifier;

        if ((zoomPercentage) <= 0) {
            return;
        }

        // Update zoom in this class, then update the zoom of the current pages
        this.setState({zoomScale: zoomPercentage}, () => {
            this.state.pdfPageObjects.forEach((page: React.RefObject<PDFPage>) => {page.current?.scalePage(zoomPercentage) });
        })
    }

    public async loadNewPDF(data: ArrayBuffer): Promise<void> {
        // Wrap in promise because sometimes we need to wait till the new pdf is rendered! Just a good practice I guess ?;)
        await new Promise<void>((resolve) => {
            // Update starting data and intialize again
            this.setState({ pdfData: data, pdfPages: [], pdfPageObjects: [], zoomScale: 1 }, async () => {
                await this.renderPDF();
                resolve();
            })
        })
    }

    public async savePDF(): Promise<void> {
        if (this.state.pdfData == undefined) {
            return;
        }
        
        // Load the existing PDF and necessary dimensions
        const pdfDoc = await PDFLib.PDFDocument.load(this.state.pdfData.slice(0));

        if (!pdfDoc) {
            return;
        }

        const regularPageHeight: number = pdfDoc.getPage(0).getHeight();

        // Loop through all rendered pages to check for annotations
        for (let i = 0; i < this.state.pdfPageObjects.length; i++) {
            // First check for comments
            const pdfComments = this.state.pdfPageObjects[i].current?.state.commentSectionElementRefs;

            if (pdfComments == undefined || pdfComments.length == 0) {
                continue;
            }

            // Now sort the comments into columns based on overflow (sometimes there are too many comments, so we expand horizontally!)
            const horizontalPadding: number = 10; // The actuall padding is 5 px between each! Its just divided by 2
            const verticalPadding: number = 10;
            const commentHeights = pdfComments.map(commentRef => commentRef.current?.state.height).filter(height => height !== undefined) as number[]; 
            const heightLimit: number = Math.max(commentHeights.length > 0 ? Math.max(...commentHeights) : 0, regularPageHeight) + (verticalPadding / 2);

            let currentHeight = 0;
            let currentColumn = 0;
            const columns: (React.RefObject<PDFPageCommentAnnotation> | React.RefObject<ImportedPDFPageCommentAnnotation>)[][] = [[]];

            pdfComments?.forEach((comment: (React.RefObject<PDFPageCommentAnnotation> | React.RefObject<ImportedPDFPageCommentAnnotation>)) => {
                if (comment.current == undefined) {
                    return;
                } else if (currentHeight + comment.current.state.height <= heightLimit) { // If height of comment is less than the column height, then add it!
                    currentHeight += comment.current.state.height;
                    columns[currentColumn].push(comment);
                } else { // Otherwise, we simply add the comment to a new column horizontally making sure to conserve its height!
                    currentColumn++;
                    columns[currentColumn] = [comment];
                    currentHeight = comment.current.state.height;
                }
            })

            // Now that we have all the columns, LETS START adding the comments to the page!
            const page = pdfDoc.getPage(i);
            page.setSize(page.getWidth() + columns.length * (250 + horizontalPadding), heightLimit + verticalPadding);

            // Draw comments onto pdf
            let startX = page.getWidth() - (columns.length * (250 + horizontalPadding));
            for (let col = 0; col < columns.length; col++) {
                let startY = page.getHeight(); // Start from the top of the page

                columns[col].forEach(commentRef => {
                    if (commentRef.current == undefined) {
                        return;
                    }

                    const height = commentRef.current.state.height;
                    const width = 250;
                    
                    const commentColors: number[] = commentRef.current.state.matchingColor.match(/\d+(\.\d+)?/g)?.map(Number) as number[]; // grab numbers from rgba string in order
                    const commentColor = PDFLib.rgb(commentColors[0] / 255, commentColors[1] / 255, commentColors[2] / 255); 
                    
                    const commentIconRadius: number = 5;

                    // Draw a rectangle for the comment box
                    page.drawRectangle({
                        x: startX + (horizontalPadding / 2), // A little padding from the left of the column
                        y: startY - height - (verticalPadding / 2), // Start from top and go down by height
                        width: width,
                        height: height,
                        borderColor: PDFLib.rgb(0, 0, 0), // Black border
                        borderWidth: 1,
                    });

                    // Draw circle of the color of the highlight
                    page.drawCircle({
                        x: startX + (horizontalPadding / 2) + commentIconRadius + 8, // A little padding from the left of the column
                        y: startY - (verticalPadding / 2) - commentIconRadius - 8, // Start from top and go down by height
                        size: commentIconRadius*2,
                        color: commentColor,
                        borderColor: PDFLib.rgb(0, 0, 0),
                        borderWidth: 1,
                    })

                    // Add annotated text
                    page.drawText(`Annotated: [ ${commentRef.current.getTextCommented() } ]`, {
                        x: startX + (horizontalPadding / 2) + (commentIconRadius * 2) + 8 + 10,
                        y: startY - (verticalPadding / 2) - commentIconRadius - 8 - 3.5,
                        size: 10,
                        maxWidth: width - (commentIconRadius * 2) - 8 - 10,
                        lineHeight: 10,
                    });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
                    context.font = `${10}px Arial`;  // Use the appropriate font
                    const underTopTextPixels = (context.measureText(`Annotated: [ ${commentRef.current.getTextCommented() } ]`).width / (width - (commentIconRadius * 2) - 8 - 10)) * 10;

                    page.drawText(`Comment: "${commentRef.current.getComment() }"`, {
                        x: startX + (horizontalPadding / 2) + (commentIconRadius * 2) + 8 + 10,
                        y: startY - (verticalPadding / 2) - commentIconRadius - 8 - 3.5 - underTopTextPixels - 20,
                        size: 11,
                        maxWidth: width - (commentIconRadius * 2) - 8 - 10,
                        lineHeight: 11,
                    });

                    startY -= height + 10; // Move down for the next comment box
                });

                startX += 250 + (horizontalPadding / 2);
            }

            // Now that comments are draw, we must draw the highlights / annotations!

            const pageAnnotations = this.state.pdfPageObjects[i].current?.state.annotationLayerElementRefs;

            if (pageAnnotations == undefined) {
                continue;
            }

            for (let j = 0; j < pageAnnotations.length; j++) {
                const annotationObject =  pageAnnotations[j].current;
                const annotation = annotationObject?.getResizeRatio(1);

                if (annotationObject == undefined || annotation == undefined) {
                    continue;
                }

                for (let k = 0; k < annotation.clipPathPolygons.length; k++) {
                    const highlightBox = annotation.clipPathPolygons[k];
                    const highlightColors: number[] = annotationObject.state.highlightColor.match(/\d+(\.\d+)?/g)?.map(Number) as number[];
                    const highlightColor = PDFLib.rgb(highlightColors[0] / 255, highlightColors[1] / 255, highlightColors[2] / 255);

                    const left: number = annotation.leftOffset + highlightBox[0].x;
                    const top: number = annotation.topOffset + highlightBox[0].y;

                    const width: number = highlightBox[1].x - highlightBox[0].x;
                    const height: number = highlightBox[2].y - highlightBox[1].y;

                    page.drawRectangle({
                        x: left,
                        y: heightLimit - (verticalPadding / 2) - top - height,
                        width: width,
                        height: height,
                        color: highlightColor,
                        opacity: highlightColors[3],
                    })
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        
        // Create a Blob and download it
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'annotated.pdf';
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
    }

    public async savePDFAsEditable(): Promise<void> {
        if (this.state.pdfData == undefined) {
            return;
        }

        const savedAnnotations: SavedAnnotations = {
            comments: [],
            annotations: []
        }

        for (let i = 0; i < this.state.pdfPageObjects.length; i++) {
            const pageObject = this.state.pdfPageObjects[i].current;

            if (!pageObject) {
                return;
            }

            const pageComments = pageObject.state.commentSectionElementRefs;

            for (let  j = 0; j < pageComments.length; j++) {
                const comment = pageComments[j].current;

                if (comment == undefined) {
                    continue;
                }

                const commentData: CommentData = {
                    pageNumber: i,
                    identifier: comment.props.identifier,
                    textCommented: comment.getTextCommented(),
                    comment: comment.getComment(),
                    matchingColor: comment.state.matchingColor
                }

                savedAnnotations.comments.push(commentData);
            }

            const pageAnnotations = pageObject.state.annotationLayerElementRefs;

            for (let k = 0; k < pageAnnotations.length; k++) {
                
                const annotation = pageAnnotations[k].current?.state;
                const annotationObject = pageAnnotations[k].current;

                if (annotation == undefined || annotationObject == undefined) {
                    continue;
                }

                const annotationData: AnnotationData = {
                    pageNumber: i,
                    identifier: annotationObject.props.identifier,
                    clipPathId: annotation.clipPathId,
                    clipPathPolygonPoints: annotation.clipPathPolygons.map((polygon: JSX.Element) => {return polygon.props.points}) as string[],
                    leftOffset: annotation.leftOffset,
                    topOffset: annotation.topOffset,
                    toolbarLeftOffset: annotation.toolbarLeftOffset,
                    toolbarTopOffset: annotation.topOffset,
                    width: annotation.width,
                    height: annotation.height,
                    annotationColor: annotationObject.state.highlightColor
                }

                savedAnnotations.annotations.push(annotationData);
            }
        }

        // Convert the data object to a JSON string
        const jsonString = JSON.stringify(savedAnnotations);

        // Convert the JSON string to an ArrayBuffer
        const encoder = new TextEncoder();
        const jsonArrayBuffer = encoder.encode(jsonString);

        // Create a buffer to hold the length of the JSON data
        const jsonLengthBuffer = new Uint32Array([jsonArrayBuffer.byteLength]).buffer;

        const pdfArrayBuffer = this.state.pdfData;

        const combinedBuffer = new Uint8Array(
            jsonLengthBuffer.byteLength + jsonArrayBuffer.byteLength + pdfArrayBuffer.byteLength
        );

        // Combine everything into one buffer
        combinedBuffer.set(new Uint8Array(jsonLengthBuffer), 0);
        combinedBuffer.set(new Uint8Array(jsonArrayBuffer), jsonLengthBuffer.byteLength);
        combinedBuffer.set(new Uint8Array(pdfArrayBuffer), jsonLengthBuffer.byteLength + jsonArrayBuffer.byteLength);

        const blob = new Blob([combinedBuffer], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'pdf_data_editable.bin'; // You can set a custom filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Config bin represents a pdf_data_editable.bin file read as a array buffer
    public async loadNewPDFFromEditable(configBin: ArrayBuffer): Promise<void> {
        const dataView = new DataView(configBin);
    
        // Read the first 4 bytes to get the length of the JSON data
        const jsonLength = dataView.getUint32(0, true);
    
        // Extract the JSON data part (after the first 4 bytes)
        const jsonArrayBuffer = configBin.slice(4, 4 + jsonLength);
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(jsonArrayBuffer);
        const data = JSON.parse(jsonString) as SavedAnnotations;
    
        // Extract the PDF data part (after the JSON data)
        const pdfArrayBuffer = configBin.slice(4 + jsonLength);
    
        // Now you have the JSON data and the PDF ArrayBuffer
        // console.log('Extracted JSON Data:', data);
        // console.log('Extracted PDF ArrayBuffer:', pdfArrayBuffer);

        // Load pdf from config
        await this.loadNewPDF(pdfArrayBuffer);

        // Now loop through config and add annotations and comments
        const annotations = data.annotations;
        const comments = data.comments;

        for (let i = 0; i < annotations.length; i++) {
            const annotation = annotations[i] as AnnotationData;
            const renderedPageNumber: number = this.state.pdfPageObjects.length-1; // -1 is to follow 0 indexing

            if (annotation.pageNumber > renderedPageNumber) {
                await this.renderPDFPages(renderedPageNumber+1, (annotation.pageNumber - renderedPageNumber));
            }

            await this.state.pdfPageObjects[annotation.pageNumber].current?.importHighlightedTextAnnotationFromData(annotation);
        }

        for (let j = 0; j < comments.length; j++) {
            const comment = comments[j] as CommentData;
            const renderedPageNumber: number = this.state.pdfPageObjects.length-1;

            if (comment.pageNumber > renderedPageNumber) {
                await this.renderPDFPages(renderedPageNumber+1, (comment.pageNumber - renderedPageNumber));
            }

            await this.state.pdfPageObjects[comment.pageNumber].current?.importCommentFromData(comment);
        }
    }

    public componentDidMount(): void {
        this.initialzeViewer();
    }

    public render(): React.ReactNode {
        return (
            <section className="pdf-view-container">
                <div className="pdf-view-column-container" ref={this.pdfViewerContainer}>
                    {this.state.pdfPages}
                </div>
                <div className="pdf-editor-toolbar-container">
                    <button className="pdf-toolbar-item" title="Highlight" onClick={this.toggleHighlightMode.bind(this)} ref={this.pdfViewerToolbarHighlightButton}>
                        <img src={"/Components/PDFViewer/toolbarButton-editorHighlight.svg"}></img>
                    </button>
                    <button className="pdf-toolbar-item" title="Comment" onClick={this.toggleCommentMode.bind(this)} ref={this.pdfViewerToolbarCommentButton}>
                        <img src={"/Components/PDFViewer/toolbarButton-comment.svg"}></img>
                    </button>
                    <div className="pdf-toolbar-pallete-container">
                        <div style={{ backgroundColor: "rgba(215, 255, 39, 1)" }} className="pdf-toolbar-pallete-color selected-pallete-color" ref={this.pdfViewerToolbarColorChoiceButtons.yellowChoice} onClick={() => this.changeAnnotationColor("rgba(215, 255, 39, 0.548)", this.pdfViewerToolbarColorChoiceButtons.yellowChoice)}></div>
                        <div style={{ backgroundColor: "rgba(107, 28, 255, 1)" }} className="pdf-toolbar-pallete-color" ref={this.pdfViewerToolbarColorChoiceButtons.purpleChoice} onClick={() => this.changeAnnotationColor("rgba(107, 28, 255, 0.548)", this.pdfViewerToolbarColorChoiceButtons.purpleChoice)}></div>
                        <div style={{ backgroundColor: "rgba(168, 255, 28, 1)" }} className="pdf-toolbar-pallete-color" ref={this.pdfViewerToolbarColorChoiceButtons.greenChoice} onClick={() => this.changeAnnotationColor("rgba(168, 255, 28, 0.548)", this.pdfViewerToolbarColorChoiceButtons.greenChoice)}></div>
                        <div style={{ backgroundColor: "rgba(255, 15, 75, 1)" }} className="pdf-toolbar-pallete-color" ref={this.pdfViewerToolbarColorChoiceButtons.redChoice} onClick={() => this.changeAnnotationColor("rgba(255, 15, 75, 0.548)", this.pdfViewerToolbarColorChoiceButtons.redChoice)}></div>
                        <div style={{ backgroundColor: "rgba(15, 127, 255, 1)" }} className="pdf-toolbar-pallete-color" ref={this.pdfViewerToolbarColorChoiceButtons.blueChoice} onClick={() => this.changeAnnotationColor("rgba(15, 127, 255, 0.548)", this.pdfViewerToolbarColorChoiceButtons.blueChoice)}></div>
                    </div>
                </div>
            </section>
        )
    }
}

export { PDFViewer };