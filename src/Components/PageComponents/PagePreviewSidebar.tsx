import * as React from "react";
import * as PDFJS from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { RefProxy } from "pdfjs-dist/types/src/display/api";
import { PDFViewer } from "./PdfAnnotator";
import "./PagePreviewSidebar.css";

interface SidebarPagePreviewProps {
    page: PDFJS.PDFPageProxy;
    pagePDFViewer: PDFViewer;
}

interface SidebarPagePreviewState {
    scaledWidth: number;
    scaledHeight: number;
    pagePreviewPNG: string;
}

class SidebarPagePreview extends React.Component<SidebarPagePreviewProps, SidebarPagePreviewState> {
    private pagePreviewContainer: React.RefObject<HTMLButtonElement>;
    private page: PDFJS.PDFPageProxy;
    private pagePDFViewer: PDFViewer;

    constructor(props: SidebarPagePreviewProps) {
        super(props);
        this.pagePreviewContainer = React.createRef<HTMLButtonElement>();
        this.pagePDFViewer = props.pagePDFViewer;
        this.page = props.page;

        this.state = {
            scaledWidth: 98,
            scaledHeight: 126,
            pagePreviewPNG: ""
        }
    }

    private getPagePreviewDimensions(): PDFJS.PageViewport | null {
        const container: HTMLButtonElement | null = this.pagePreviewContainer.current;

        if (!container) {
            return null;
        }

        const viewport: PDFJS.PageViewport = this.page.getViewport({ scale: 1 });
        const sidebarWidth = 240; // the pixel width of the sidebar
        const scale = sidebarWidth / (viewport.width * 2);
        const scaledViewport = this.page.getViewport({ scale: scale });

        return scaledViewport;
    }

    private async renderPagePreviewDrawings(): Promise<void> {
        const container: HTMLButtonElement | null = this.pagePreviewContainer.current;

        if (!container) {
            return;
        }

        const viewport: PDFJS.PageViewport | null = this.getPagePreviewDimensions();

        if (!viewport) {
            return;
        }
        
        // Create canvas and draw pdf, in which we will save
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render pdf page drawing
        await this.page.render({
            canvasContext: canvas.getContext("2d") as CanvasRenderingContext2D,
            viewport: viewport
        }).promise;

        // Now assign preview image and dimensions
        this.setState({ scaledWidth: viewport.width, scaledHeight: viewport.height, pagePreviewPNG: `url(${canvas.toDataURL("image/png")})` });
    }

    public componentDidMount(): void {
        this.renderPagePreviewDrawings();
    }

    public render(): React.ReactNode {
        return (
            <button className="sidebar-page-preview-item" ref={this.pagePreviewContainer} onClick={() => this.pagePDFViewer.travelToPage(this.page.pageNumber-1)} style={{
                width: `${this.state.scaledWidth}px`,
                height: `${this.state.scaledHeight}px`,
                backgroundImage: this.state.pagePreviewPNG
            }}></button>
        );
    }
}

interface SidebarOutlineItemPreviewProps {
    outlineTitle: string,
    outlinePageDestination: number;
    pagePDFViewer: PDFViewer;
}

class SidebarOutlineItemPreview extends React.Component<SidebarOutlineItemPreviewProps> {
    private outlineTitle: string;
    private outlinePageDestination: number;
    private pagePDFViewer: PDFViewer;

    constructor(props: SidebarOutlineItemPreviewProps) {
        super(props);

        this.outlineTitle = props.outlineTitle;
        this.outlinePageDestination = props.outlinePageDestination;
        this.pagePDFViewer = props.pagePDFViewer;
    }

    public render(): React.ReactNode {
        return (
            <button className="sidebar-outline-item" onClick={() => this.pagePDFViewer.travelToPage(this.outlinePageDestination)}>{this.outlineTitle}</button>
        )
    }
}

interface AnnotatorSidebarProps {
    pdfData: ArrayBuffer | undefined;
}

interface AnnotatorSidebarState {
    isToggled: boolean;
    previewMode: string;

    pdfData: ArrayBuffer | undefined;
    pdfDocument: PDFJS.PDFDocumentProxy | null;

    pdfPreviewPages: React.ReactNode[],
    pdfOutlineItems: React.ReactNode[]
}

class AnnotatorSidebar extends React.Component<AnnotatorSidebarProps, AnnotatorSidebarState> {
    private pagePDFViewer: PDFViewer | null = null;
    private pdfPreviewsContainer: React.RefObject<HTMLDivElement>;

    constructor(props: AnnotatorSidebarProps) {
        super(props);
        this.pdfPreviewsContainer = React.createRef<HTMLDivElement>();

        this.state = {
            isToggled: true,
            previewMode: "pagePreview",

            pdfData: props.pdfData,
            pdfDocument: null,

            pdfPreviewPages: [],
            pdfOutlineItems: []
        }
    }

    // Functions involving the startup of the sidebar

    private async renderPDFOutline(): Promise<void> {
        const pdfDocument: PDFJS.PDFDocumentProxy | null = this.state.pdfDocument;
        const pagePDFViewer: PDFViewer | null = this.pagePDFViewer;

        if (!pdfDocument || !pagePDFViewer) {
            return;
        }

        const outline: Array<unknown> = await pdfDocument.getOutline();

        if (!outline) {
            return;
        }

        const outlineItems: React.ReactNode[] = this.state.pdfOutlineItems;

        for (let i = 0; i < outline.length; i++) {
            const outlineItemObject = (outline as Array<{
                title: string;
                bold: boolean;
                italic: boolean;
                color: Uint8ClampedArray;
                dest: string | Array<unknown> | null;
                url: string | null;
                unsafeUrl: string | undefined;
                newWindow: boolean | undefined;
                count: number | undefined;
                items: Array<unknown>;
            }>)[i];

            const dest = (outlineItemObject as { dest: (string | Array<unknown> | null) }).dest as unknown[]; // Theres no type for this so we gotta hack it
            const outlineDestinationPageNumber: number = await pdfDocument.getPageIndex(dest[0] as RefProxy);
            const outlineItem: React.ReactNode = React.createElement(SidebarOutlineItemPreview, {
                outlineTitle: outlineItemObject.title,
                outlinePageDestination: outlineDestinationPageNumber,
                pagePDFViewer: pagePDFViewer,
                key: Math.random()
            })

            outlineItems.push(outlineItem);
        }

        return new Promise<void>((resolve) => {
            this.setState({ pdfOutlineItems: outlineItems }, resolve);
        })
    }

    private async renderPagePreviews(start: number, length: number): Promise<void> {
        const pdfDocument: PDFJS.PDFDocumentProxy | null = this.state.pdfDocument;
        const pagePDFViewer: PDFViewer | null = this.pagePDFViewer;

        if (!pdfDocument || !pagePDFViewer) {
            return;
        }

        const numPages: number = pdfDocument.numPages as number;

        if (start > numPages) {
            return;
        }

        if (start + length > numPages) {
            length = numPages - start; // If the length goes over the amount of pages, adjust the length to cover the rest
        }

        const pages: React.ReactNode[] = this.state.pdfPreviewPages;

        for (let i = start; i < (start + length); i++) {
            const page: PDFJS.PDFPageProxy = await pdfDocument.getPage(i+1) as PDFJS.PDFPageProxy;
            const newPage: React.ReactNode = React.createElement(SidebarPagePreview, {page: page, pagePDFViewer: pagePDFViewer, key: Math.random()});
            pages.push(newPage);
        }

        // Render new pdf pages
        return new Promise<void>((resolve) => {
            this.setState({ pdfPreviewPages: pages }, resolve);
        })
    }

    private async loadCurrentPDF(): Promise<PDFJS.PDFDocumentProxy> {
        // Set worker
        PDFJS.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";

        let loadingTask: PDFJS.PDFDocumentLoadingTask;

        if (this.state.pdfData) {
            loadingTask = PDFJS.getDocument({
                data: this.state.pdfData.slice(0),
                enableXfa: true,
                disableAutoFetch: true,
                disableStream: true,
            });
        } else {
            // Load backup / default pdf
            loadingTask = PDFJS.getDocument({
                data: await fetch("https://johnathantam.github.io/PDFAnnotator/test/unte.pdf").then(res => res.arrayBuffer()),
                enableXfa: true,
                disableAutoFetch: true,
                disableStream: true,
            });
        }

        // Wait for the PDF document to load and store it in a variable
        const pdfDocument: PDFJS.PDFDocumentProxy = await loadingTask.promise;

        return pdfDocument;
    }

    private async renderSidebar(): Promise<void> {
        const pdfDocument = await this.loadCurrentPDF();
        return new Promise<void>((resolve) => {
            this.setState({ pdfDocument: pdfDocument }, () => {
                if (this.state.pdfDocument !== null) {
                    this.renderPagePreviews(0, 20);
                    this.renderPDFOutline();
                }

                resolve();
            })
        })
    }

    // Functions regarding the alive state

    private async progressiveLoadOnScroll(): Promise<void> {
        const container: HTMLDivElement | null = this.pdfPreviewsContainer.current;
        const pdfDocument: PDFJS.PDFDocumentProxy | null = this.state.pdfDocument;

        if (!container || !pdfDocument) {
            return;
        }

        if (container.innerHTML.trim() === "") { // If the container is empty i.e when clearing the viewer, don't run!
            return;
        }

        const numPages: number = (pdfDocument.numPages - 1) as number;
        const numOfRenderedPages: number = this.state.pdfPreviewPages.length;
        const scrollTop: number = container.scrollTop;
        const scrollHeight: number = container.scrollHeight;
        const clientHeight: number = container.clientHeight;
        const scrollPercentage: number = (scrollTop + clientHeight) / scrollHeight;

        if (scrollPercentage > 0.8 && numOfRenderedPages <= numPages) {
            // Load the next set of pages when 80% scrolled
            await this.renderPagePreviews(numOfRenderedPages, 2);
        }
    }

    private toggleSidebarMode(mode: string): void { // This function switches between the outline preview and the page preview modes
        if (mode != "pagePreview" && mode != "outlinePreview") {
            return;
        }

        this.setState({previewMode: mode});
    }

    public async loadNewPDF(data: ArrayBuffer): Promise<void> {
        await new Promise<void>((resolve) => {
            // First we clear old data, then render the new data!
            this.setState({ pdfData: data, previewMode: "pagePreview", pdfPreviewPages: [], pdfOutlineItems: [] }, async () => {
                await this.renderSidebar();
                resolve();
            })
        })
    }

    public toggleSidebar(): void { // This function enables or disables the sidebar (called from outside this class)
        this.setState({ isToggled: !this.state.isToggled });
    }

    public assignPagePDFViewer(pdfViewer: PDFViewer): void {
        this.pagePDFViewer = pdfViewer;
    }

    // Render functions

    public componentDidMount(): void {
        this.renderSidebar();
        this.pdfPreviewsContainer.current?.addEventListener("scroll", this.progressiveLoadOnScroll.bind(this));
    }

    public render(): React.ReactNode {
        return (
            <div className={`sidebar-container ${this.state.isToggled ? "" : "is-closed"}`} >
                <section className="sidebar-content-container">
                    <div className="sidebar-tools-container">
                        <button className="sidebar-tool-button" title="Pages" onClick={() => this.toggleSidebarMode("pagePreview")}>
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/PagePreview/toolbarButton-viewLayers.svg"}></img>
                        </button>
                        <button className="sidebar-tool-button" title="Outline" onClick={() => this.toggleSidebarMode("outlinePreview")}>
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/PagePreview/toolbarButton-viewOutline.svg"}></img>
                        </button>
                    </div>
                    <div className="sidebar-page-preview-container" ref={this.pdfPreviewsContainer} style={{ display: `${this.state.previewMode === "pagePreview" ? "block" : "none"}` }}>
                        {this.state.pdfPreviewPages}
                    </div>
                    <div className="sidebar-outline-preview-container" style={{ display: `${this.state.previewMode === "outlinePreview" ? "block" : "none"}` }}>
                        {this.state.pdfOutlineItems}
                    </div>
                </section>
            </div>
        )
    }
}

export { AnnotatorSidebar };