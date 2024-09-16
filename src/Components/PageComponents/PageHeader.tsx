import * as React from "react";
import { AnnotatorSidebar } from "./PagePreviewSidebar";
import { PDFViewer } from "./PdfAnnotator";
import "./PageHeader.css";

// Responsible for:
// - Uploading pdfs to annotate
// - Exporting pdfs and .annttr files
// - Sending message to Sidebar element for disabling and enabling sidebar

interface AnnotatorHeaderState {
    currentPageValue: number | string;
    totalPageNumber: number;
}

class AnnotatorHeader extends React.Component<object, AnnotatorHeaderState> {
    private pageSidebar: AnnotatorSidebar | null = null;
    private pagePDFViewer: PDFViewer | null = null;

    constructor(props: object) {
        super(props);

        this.state = {
            currentPageValue: 1,
            totalPageNumber: 162,
        }
    }

    private async importPDF(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];
        const fileReader = new FileReader();

        fileReader.onload = async (event) => {
            const viewerArrayBuffer = event.target?.result as ArrayBuffer;
            if (viewerArrayBuffer) {
                await this.pagePDFViewer?.loadNewPDF(viewerArrayBuffer.slice(0));
                await this.pageSidebar?.loadNewPDF(viewerArrayBuffer.slice(0));

                this.updateTotalPageNumber();
                this.setState({ currentPageValue: 1 });
            }
        };

        fileReader.readAsArrayBuffer(file);
    }

    private async importPDFBin(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];
        const fileReader = new FileReader();

        fileReader.onload = (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            console.log("first ", arrayBuffer)
            this.pagePDFViewer?.loadNewPDFFromEditable(arrayBuffer.slice(0));
            this.pageSidebar?.loadNewPDF(arrayBuffer.slice(0));
        };
    
        fileReader.readAsArrayBuffer(file);
    }

    private updateTotalPageNumber(): void {
        const pageCount: number | null | undefined = this.pagePDFViewer?.getTotalPageNumberOfPDF();

        if (!pageCount) {
            return;
        }

        this.setState({ totalPageNumber: pageCount });
    }

    private updateCurrentPageNumber(): void {
        const pageNumber: number | null | undefined = this.pagePDFViewer?.getCurrentPageNumber();

        if (pageNumber == null || pageNumber == undefined) {
            return;
        }

        this.setState({ currentPageValue: pageNumber + 1 });
    }

    private navigateToPage(input: string): void {
        // Parse the input value to ensure it's a valid number
        const pageNumber = Math.abs(parseInt(input) - 1);

        if (isNaN(pageNumber) || pageNumber < 0) {
            return;
        }

        // Call the method to perform actions based on the new page number
        this.pagePDFViewer?.travelToPage(pageNumber);
    }

    public assignPageSidebar(pageSidebar: AnnotatorSidebar): void {
        this.pageSidebar = pageSidebar;
    }

    public assignPagePDFViewer(pdfViewer: PDFViewer): void {
        this.pagePDFViewer = pdfViewer;
        pdfViewer.getViewerContainer()?.addEventListener("scroll", this.updateCurrentPageNumber.bind(this)); // Start tracking the live page count
    }

    public render(): React.ReactNode {
        return (
            <header className="annotator-header">
                <div className="start">
                    <button className="header-left-sidebar-toggle-button" title="Sidebar" onClick={() => this.pageSidebar?.toggleSidebar()}>
                        <img src={"https://johnathantam.github.io/PDFAnnotator/Components/Header/sidebarToggle.svg"}></img>
                    </button>
                    <h1 className="header-left-page-title">PDF -{'>'} A n n o t a t o r</h1>
                </div>
                <div className="center">
                    <div className="center-page-count-container">
                        <input className="center-page-count-input" value={this.state.currentPageValue} onChange={(event) => this.setState({ currentPageValue: event.target.value})} onKeyDown={(event) => {if (event.key == "Enter") this.navigateToPage(event.currentTarget.value)}}  onBlur={(event) => {this.navigateToPage(event.target.value);}}></input>
                        <span> / </span>
                        <p>{this.state.totalPageNumber}</p>
                    </div>
                    <span className="center-controls-seperator"></span>
                    <div className="center-zoom-controls-container">
                        <button className="center-zoom-control-button" title="Zoom In" onClick={() => this.pagePDFViewer?.zoom(0.05)}>
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/Header/toolbarButton-zoomIn.svg"}></img>
                        </button>
                        <span>/</span>
                        <button className="center-zoom-control-button" title="Zoom Out" onClick={() => this.pagePDFViewer?.zoom(-0.05)}>
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/Header/toolbarButton-zoomOut.svg"}></img>
                        </button>
                    </div>
                </div>
                <div className="end">
                    <button className="rightview-item-button" onClick={() => { this.pagePDFViewer?.savePDF(); this.pagePDFViewer?.savePDFAsEditable() }}>
                        <div className="rightview-port-action-icon">
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/Header/toolbarButton-openFile.svg"}></img>
                        </div>
                        <p className="rightview-port-action-icon-description">Export</p>
                    </button>

                    <input type="file" accept="application/pdf application/bin" style={{ display: 'none' }} id={"upload-pdf-editable-input"} onChange={this.importPDFBin.bind(this)}/>
                    <label htmlFor="upload-pdf-editable-input" className="rightview-item-button">
                        <div className="rightview-port-action-icon">
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/Header/toolbarButton-uploadBin.svg"}></img>
                        </div>
                        <p className="rightview-port-action-icon-description">Upload .bin</p>
                    </label>

                    <input type="file" accept="application/pdf application/bin" style={{ display: 'none' }} id={"upload-pdf-input"} onChange={this.importPDF.bind(this)}/>
                    <label htmlFor="upload-pdf-input" className="rightview-item-button">
                        <div className="rightview-port-action-icon">
                            <img src={"https://johnathantam.github.io/PDFAnnotator/Components/Header/toolbarButton-upload.svg"}></img>
                        </div>
                        <p className="rightview-port-action-icon-description">Upload PDF</p>
                    </label>
                </div>
            </header>
        )
    }
}

export { AnnotatorHeader };