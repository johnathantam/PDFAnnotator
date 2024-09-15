import * as React from 'react';
import { AnnotatorSidebar } from '../Components/PageComponents/PagePreviewSidebar';
import { PDFViewer } from '../Components/PageComponents/PdfAnnotator';
import { AnnotatorHeader } from '../Components/PageComponents/PageHeader';
import "./Annotator.css";

class AnnotatorPage extends React.Component {
    private header: React.RefObject<AnnotatorHeader>;
    private sidebar: React.RefObject<AnnotatorSidebar>;
    private pdfViewer: React.RefObject<PDFViewer>;

    constructor(props: object) {
        super(props);

        this.header = React.createRef<AnnotatorHeader>();
        this.sidebar = React.createRef<AnnotatorSidebar>();
        this.pdfViewer = React.createRef<PDFViewer>();
    }

    private connectSidebarToHeader(): void {
        // Assign header components
        this.header.current?.assignPageSidebar(this.sidebar.current as AnnotatorSidebar);
    }

    private connectPDFViewerToSidebarAndHeader(): void {
        this.header.current?.assignPagePDFViewer(this.pdfViewer.current as PDFViewer);
        this.sidebar.current?.assignPagePDFViewer(this.pdfViewer.current as PDFViewer);
    }

    public componentDidMount(): void {
        this.connectSidebarToHeader();
        this.connectPDFViewerToSidebarAndHeader();
    }

    public render(): React.ReactNode {
        return (
            <>  
                <main className='content-container'>
                    <AnnotatorHeader ref={this.header}></AnnotatorHeader>
                    <div className='main-content'>
                        <AnnotatorSidebar pdfData={undefined} ref={this.sidebar}></AnnotatorSidebar>
                        <PDFViewer pdfData={undefined} ref={this.pdfViewer}></PDFViewer>
                    </div>
                </main>
            </>
        )
    }
}

export { AnnotatorPage };