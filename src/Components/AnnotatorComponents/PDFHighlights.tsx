import * as React from "react";
import { AnnotationData } from "../../interfaces/AnnotationData";
import "./PDFHighlights.css";

export interface PDFPageHighlightAnnotationProps {
    identifier: number | string;
    range: Range | undefined;
    highlightColor: string;

    onColorChange?: (newColor: string) => void;
    onSelection?: () => void;
    onRemove: (key: number | string) => void;
}

export interface ImportedPDFPageHighlightAnnotationProps {
    identifier: number | string;
    highlightData: AnnotationData;

    onColorChange?: (newColor: string) => void;
    onSelection?: () => void;
    onRemove: (key: number | string) => void;
}

// export interface PDF

interface PDFPageHighlightAnnotationState {
    topOffset: number;
    leftOffset: number;
    width: number;
    height: number;
    clipPathId: string;
    clipPathPolygons: JSX.Element[];
    toolbarTopOffset: number;
    toolbarLeftOffset: number;

    highlightIsSelected: boolean;
    highlightColor: string;
}

abstract class HighlightAnnotation<P extends PDFPageHighlightAnnotationProps | ImportedPDFPageHighlightAnnotationProps> extends React.Component<P, PDFPageHighlightAnnotationState> {
    protected highlightAnnotationContainer: React.RefObject<HTMLDivElement>;
    protected highlightAnnotationToolbarColorChoiceButtons: { 
        yellowChoice: React.RefObject<HTMLButtonElement>, 
        purpleChoice: React.RefObject<HTMLButtonElement>,
        greenChoice: React.RefObject<HTMLButtonElement>,
        redChoice: React.RefObject<HTMLButtonElement>,
        blueChoice: React.RefObject<HTMLButtonElement>,
    };

    protected onColorChangeCallback?: (newColor: string) => void;
    protected onSelectionCallback?: () => void;

    constructor(props: P) {
        super(props);

        this.highlightAnnotationContainer = React.createRef<HTMLDivElement>();
        this.highlightAnnotationToolbarColorChoiceButtons = {
            yellowChoice: React.createRef<HTMLButtonElement>(),
            purpleChoice: React.createRef<HTMLButtonElement>(),
            greenChoice: React.createRef<HTMLButtonElement>(),
            redChoice: React.createRef<HTMLButtonElement>(),
            blueChoice: React.createRef<HTMLButtonElement>(),
        };

        this.onColorChangeCallback = props.onColorChange;
        this.onSelectionCallback = props.onSelection;

        this.state = {
            topOffset: 0,
            leftOffset: 0,
            width: 0,
            height: 0,
            clipPathId: `clipPath${Math.random()}`,
            clipPathPolygons: [],
            toolbarTopOffset: 0,
            toolbarLeftOffset: 0,
            highlightIsSelected: false,
            highlightColor: "",
        };
    }

    // Abstract method to be implemented by subclasses for initialization
    // The initialization just sets the state variables / style of the 
    // annotation!
    protected abstract initialize(): void;

    protected renderSelectedColorInHighlightToolbar(): void {
        const selectedColor: string = `${this.state.highlightColor}Choice`;
        if (Object.prototype.hasOwnProperty.call(this.highlightAnnotationToolbarColorChoiceButtons, selectedColor)) {
            const selectedChoice = this.highlightAnnotationToolbarColorChoiceButtons[selectedColor as keyof typeof this.highlightAnnotationToolbarColorChoiceButtons];
            selectedChoice.current?.classList.add("selected-pallete-color");
        }
    }

    protected changeHighlightColor(color: string, choiceColorButton: React.RefObject<HTMLButtonElement>): void {
        this.setState({ highlightColor: color }, () => {
            // Deselect all the others
            for (const [, buttonRef] of Object.entries(this.highlightAnnotationToolbarColorChoiceButtons)) {
                if (buttonRef.current) {
                    buttonRef.current.classList.remove('selected-pallete-color');
                }
            }

            // Select the chosen button
            choiceColorButton.current?.classList.add("selected-pallete-color");

            // Call the on color change event if needed
            if (this.onColorChangeCallback) {
                this.onColorChangeCallback(color);
            }
        });
    }

    protected selectHighlightAnnotation(event: React.MouseEvent<HTMLDivElement>): void {
        const target = event.target as HTMLElement;

        if (!target) {
            return;
        }

        if (target.className.includes("pdf-page-hightlight-annotation-container") && target.id == this.props.identifier.toString()) {
            this.setState({ highlightIsSelected: !this.state.highlightIsSelected });
            this.highlightAnnotationContainer.current?.classList.toggle("highlight-is-selected");
        }

        // Call the on color change event if needed
        if (this.onSelectionCallback) {
            this.onSelectionCallback();
        }
    }

    public getResizeRatio(scaleRatio: number) {
        // Calculate new dimensions and offsets based on the magnifier
        const newLeftOffset = this.state.leftOffset * scaleRatio;
        const newTopOffset = this.state.topOffset * scaleRatio;
        const newWidth = this.state.width * scaleRatio;
        const newHeight = this.state.height * scaleRatio;

        // Recalculate the clip path polygons - just goes through the point's string and multiples every point component by the scaleRatio
        const newClipPathPolygons: [{ x: number, y: number }, { x: number, y: number }, { x: number, y: number }, { x: number, y: number }][] = this.state.clipPathPolygons.map((polygon) => {
            // Parse the existing points and scale them by the magnifier
            const points = polygon.props.points.split(',').map((point: string) => {
                const [x, y] = point.trim().split(' ').map(Number);
                return { x: x * scaleRatio, y: y * scaleRatio };
            });

            return points;
        });

        return {
            leftOffset: newLeftOffset,
            topOffset: newTopOffset,
            width: newWidth,
            height: newHeight,
            clipPathPolygons: newClipPathPolygons,
        }
    }

    public resize(scaleRatio: number): void {
        // Calculate new dimensions and offsets based on the magnifier
        const newLeftOffset = this.state.leftOffset * scaleRatio;
        const newTopOffset = this.state.topOffset * scaleRatio;
        const newWidth = this.state.width * scaleRatio;
        const newHeight = this.state.height * scaleRatio;

        // Adjust the toolbar position
        const newToolbarLeftOffset = this.state.toolbarLeftOffset * scaleRatio;
        const newToolbarTopOffset = this.state.toolbarTopOffset * scaleRatio;

        // Recalculate the clip path polygons - just goes through the point's string and multiples every point component by the scaleRatio
        const newClipPathPolygons = this.state.clipPathPolygons.map((polygon) => {
            // Parse the existing points and scale them by the magnifier
            const points = polygon.props.points.split(',').map((point: string) => {
                const [x, y] = point.trim().split(' ').map(Number);
                return `${x * scaleRatio} ${y * scaleRatio}`;
            }).join(', ');

            // Return a new polygon with the updated points
            return <polygon points={points} key={Math.random()}></polygon>;
        });

        // Update the state with the new values
        this.setState({
            leftOffset: newLeftOffset,
            topOffset: newTopOffset,
            width: newWidth,
            height: newHeight,
            clipPathPolygons: newClipPathPolygons,
            toolbarLeftOffset: newToolbarLeftOffset,
            toolbarTopOffset: newToolbarTopOffset,
        });
    }

    public componentDidMount(): void {
        this.initialize();
    }

    public render(): React.ReactNode {
        return (
        <>
            <svg className="pdf-page-highlight-clip-path-outline">
                <defs>
                    <clipPath id={this.state.clipPathId}>
                    {this.state.clipPathPolygons}
                    </clipPath>
                </defs>
            </svg>
            <div className="pdf-page-hightlight-annotation-container" onClick={this.selectHighlightAnnotation.bind(this)} id={this.props.identifier.toString()} ref={this.highlightAnnotationContainer} style={{
                left: `${this.state.leftOffset}px`,
                top: `${this.state.topOffset}px`,
                width: `${this.state.width}px`,
                height: `${this.state.height}px`,
                backgroundColor: this.state.highlightColor,
                clipPath: `url('#${this.state.clipPathId}')`,
            }}></div>
            <div className="pdf-page-highlight-toolbar-container" style={{
                left: `${this.state.toolbarLeftOffset}px`,
                top: `${this.state.toolbarTopOffset}px`,
                visibility: `${this.state.highlightIsSelected ? "visible" : "hidden"}`,
            }}>
                <button style={{ backgroundColor: "rgba(215, 255, 39, 1)" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.yellowChoice} onClick={() => { this.changeHighlightColor("rgba(215, 255, 39, 0.548)", this.highlightAnnotationToolbarColorChoiceButtons.yellowChoice) }}></button>
                <button style={{ backgroundColor: "rgba(255, 15, 75, 1)" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.redChoice} onClick={() => { this.changeHighlightColor("rgba(255, 15, 75, 0.548)", this.highlightAnnotationToolbarColorChoiceButtons.redChoice) }}></button>
                <button style={{ backgroundColor: "rgba(15, 127, 255, 1)" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.blueChoice} onClick={() => { this.changeHighlightColor("rgba(15, 127, 255, 0.548)", this.highlightAnnotationToolbarColorChoiceButtons.blueChoice) }}></button>
                <button style={{ backgroundColor: "rgba(168, 255, 28, 1)" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.greenChoice} onClick={() => { this.changeHighlightColor("rgba(168, 255, 28, 0.548)", this.highlightAnnotationToolbarColorChoiceButtons.greenChoice) }}></button>
                <button style={{ backgroundColor: "rgba(107, 28, 255, 1)" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.purpleChoice} onClick={() => { this.changeHighlightColor("rgba(107, 28, 255, 0.548)", this.highlightAnnotationToolbarColorChoiceButtons.purpleChoice) }}></button>
                <button className="pdf-page-highlight-toolbar-button" onClick={() => this.props.onRemove(this.props.identifier)}>
                    <img src="https://johnathantam.github.io/PDFAnnotator/Components/PDFViewer/editor-toolbar-delete.svg" alt="delete" />
                </button>
            </div>
        </>
        );
    }
}

class PDFPageHighlightAnnotation extends HighlightAnnotation<PDFPageHighlightAnnotationProps> {
    constructor(props: PDFPageHighlightAnnotationProps) {
        super(props);
    }

    protected initialize(): void {
        // Given a range selection, lets set the state variables!
        const range: Range = this.props.range as Range;
        const overlayRect: DOMRect = range.getBoundingClientRect();

        // This is a doozy, but is designed to always give the pdf page container given the infrastruture of text in the
        // pdf page container!
        const pdfPage: HTMLElement | null | undefined = range.commonAncestorContainer.parentElement?.tagName.toLowerCase() === "span" ? range.commonAncestorContainer.parentElement?.parentElement?.parentElement : range.commonAncestorContainer.parentElement;

        if (!pdfPage || pdfPage.className !== "pdf-page-container") {
            return;
        }

        const pdfPageRect: DOMRect | undefined = pdfPage.getBoundingClientRect();

        if (!pdfPageRect) {
            return;
        }

        // Calculate the position relative to the pdf
        const relativeLeft = overlayRect.left - pdfPageRect.left;
        const relativeTop = overlayRect.top - pdfPageRect.top;

        // Now create clip path
        // Add polygons / highlights to clip path
        const highlightRects: DOMRectList = range.getClientRects();
        const highlights: JSX.Element[] = [];
        let toolbarLeftOffset: number = 0;
        let toolbarTopOffset: number = 0;

        for (let i = 0; i < highlightRects.length; i++) {
            const rect = highlightRects[i];
            const left: number = (rect.left - pdfPageRect.left) - relativeLeft;
            const top: number = (rect.top - pdfPageRect.top) - relativeTop;
            const right: number = left + rect.width;
            const bottom: number = top + rect.height;
            const clipPathPoints: string = `${left} ${top}, ${right} ${top}, ${right} ${bottom}, ${left} ${bottom}`;

            highlights.push(<polygon points={clipPathPoints} key={Math.random()}></polygon>);

            // On the last highlighted piece of text, position the toolbar to the bottom of such text for user editing
            if (i === highlightRects.length-1) {
                toolbarLeftOffset = right + relativeLeft;
                toolbarTopOffset = bottom + relativeTop;
            }
        }

        this.setState({ 
            leftOffset: relativeLeft, 
            topOffset: relativeTop, 
            width: overlayRect.width, 
            height: overlayRect.height, 

            clipPathPolygons: highlights,

            toolbarLeftOffset: toolbarLeftOffset, 
            toolbarTopOffset: toolbarTopOffset,

            highlightColor: this.props.highlightColor,
        });
    }
}

class ImportedPDFPageHighlightAnnotation extends HighlightAnnotation<ImportedPDFPageHighlightAnnotationProps> {
    constructor(props: ImportedPDFPageHighlightAnnotationProps) {
        super(props);
    }

    protected initialize(): void {
        // Pull from data and import
        const data: AnnotationData = this.props.highlightData as AnnotationData;

        // First, import the highlight polygons
        const highlights: JSX.Element[] = [];
        data.clipPathPolygonPoints.forEach((points: string) => {
            highlights.push(<polygon points={points} key={Math.random()}></polygon>);
        })

        // Now load data
        this.setState({
            leftOffset: data.leftOffset, 
            topOffset: data.topOffset, 
            width: data.width, 
            height: data.height, 

            clipPathId: data.clipPathId,
            clipPathPolygons: highlights,

            toolbarLeftOffset: data.toolbarLeftOffset, 
            toolbarTopOffset: data.toolbarTopOffset,

            highlightColor: data.annotationColor
        })
    }
}



// class PDFPageHighlightAnnotation extends React.Component<PDFPageHighlightAnnotationProps, PDFPageHighlightAnnotationState> {
//     private highlightAnnotationContainer: React.RefObject<HTMLDivElement>;
//     private range: Range | undefined;
//     private identifier: string | number;
//     private onRemove: (key: number | string) => void;

//     // On select, let the user change the color
//     private highlightAnnotationToolbarColorChoiceButtons: { 
//         yellowChoice: React.RefObject<HTMLButtonElement>, 
//         purpleChoice: React.RefObject<HTMLButtonElement>,
//         greenChoice: React.RefObject<HTMLButtonElement>,
//         redChoice: React.RefObject<HTMLButtonElement>,
//         blueChoice: React.RefObject<HTMLButtonElement>,
//     };

//     constructor(props: PDFPageHighlightAnnotationProps) {
//         super(props);
//         this.highlightAnnotationContainer = React.createRef<HTMLDivElement>();
//         this.range = props.range;
//         this.identifier = props.identifier;
//         this.onRemove = props.onRemove;

//         this.highlightAnnotationToolbarColorChoiceButtons = {
//             yellowChoice: React.createRef<HTMLButtonElement>(), 
//             purpleChoice: React.createRef<HTMLButtonElement>(),
//             greenChoice: React.createRef<HTMLButtonElement>(),
//             redChoice: React.createRef<HTMLButtonElement>(),
//             blueChoice: React.createRef<HTMLButtonElement>(),
//         }

//         this.state = {
//             topOffset: 0,
//             leftOffset: 0,
//             width: 0,
//             height: 0,

//             clipPathId: `clipPath${Math.random()}`,
//             clipPathPolygons: [],

//             toolbarTopOffset: 0,
//             toolbarLeftOffset: 0,

//             highlightIsSelected: false,
//             highlightColor: props.highlightColor
//         }
//     }

//     // Functions regarding initialization

//     private renderHighlightAnnotationFromRange(): void {
//         const range: Range = this.range as Range;
//         const overlayRect: DOMRect = range.getBoundingClientRect();

//         // This is a doozy, but is designed to always give the pdf page container given the infrastruture of text in the
//         // pdf page container!
//         const pdfPage: HTMLElement | null | undefined = range.commonAncestorContainer.parentElement?.tagName.toLowerCase() === "span" ? range.commonAncestorContainer.parentElement?.parentElement?.parentElement : range.commonAncestorContainer.parentElement;

//         if (!pdfPage || pdfPage.className !== "pdf-page-container") {
//             return;
//         }

//         const pdfPageRect: DOMRect | undefined = pdfPage.getBoundingClientRect();

//         if (!pdfPageRect) {
//             return;
//         }

//         // Calculate the position relative to the pdf
//         const relativeLeft = overlayRect.left - pdfPageRect.left;
//         const relativeTop = overlayRect.top - pdfPageRect.top;

//         // Now create clip path
//         // Add polygons / highlights to clip path
//         const highlightRects: DOMRectList = range.getClientRects();
//         const highlights: JSX.Element[] = [];
//         let toolbarLeftOffset: number = 0;
//         let toolbarTopOffset: number = 0;

//         for (let i = 0; i < highlightRects.length; i++) {
//             const rect = highlightRects[i];
//             const left: number = (rect.left - pdfPageRect.left) - relativeLeft;
//             const top: number = (rect.top - pdfPageRect.top) - relativeTop;
//             const right: number = left + rect.width;
//             const bottom: number = top + rect.height;
//             const clipPathPoints: string = `${left} ${top}, ${right} ${top}, ${right} ${bottom}, ${left} ${bottom}`;

//             highlights.push(<polygon points={clipPathPoints} key={Math.random()}></polygon>);

//             // On the last highlighted piece of text, position the toolbar to the bottom of such text for user editing
//             if (i === highlightRects.length-1) {
//                 toolbarLeftOffset = right + relativeLeft;
//                 toolbarTopOffset = bottom + relativeTop;
//             }
//         }

//         this.setState({ 
//             leftOffset: relativeLeft, 
//             topOffset: relativeTop, 
//             width: overlayRect.width, 
//             height: overlayRect.height, 

//             clipPathPolygons: highlights,

//             toolbarLeftOffset: toolbarLeftOffset, 
//             toolbarTopOffset: toolbarTopOffset 
//         });
//     }

//     private renderSelectedColorInHighlightToolbar(): void {
//         // For the toolbar, just highlight the selected color!
//         const selectedColor: string = `${this.state.highlightColor}Choice`;

//         if (Object.prototype.hasOwnProperty.call(this.highlightAnnotationToolbarColorChoiceButtons, selectedColor)) {

//             const selectedChoice = this.highlightAnnotationToolbarColorChoiceButtons[selectedColor as keyof typeof this.highlightAnnotationToolbarColorChoiceButtons];
//             selectedChoice.current?.classList.add("selected-pallete-color");
//         }
//     }

//     private initialize(): void {
//         // PDF Annotations can be loaded either through a range, or 
//         // pre determined by a data object
//         this.renderHighlightAnnotationFromRange();
//         this.renderSelectedColorInHighlightToolbar();
//     }

//     // Functions regarding the alive state

//     private selectHighlightAnnotation(event: React.MouseEvent<HTMLDivElement>): void {
//         const target = event.target as HTMLElement;

//         if (!target) {
//             return;
//         }

//         // If the click corresponds to this highlight, then we select it!
//         if (target.className == "pdf-page-hightlight-annotation-container" && target.id == this.identifier && !this.state.highlightIsSelected) {
//             this.setState({ highlightIsSelected: true }, () => {
//                 if (!this.highlightAnnotationContainer.current) {
//                     return;
//                 }

//                 this.highlightAnnotationContainer.current.classList.add("highlight-is-selected");
//             });

//             return;
//         }

//         // Otherwise, if previously selected, then we deselect!
//         if (this.state.highlightIsSelected) {
//             this.setState({ highlightIsSelected: false }, () => {
//                 if (!this.highlightAnnotationContainer.current) {
//                     return;
//                 }

//                 this.highlightAnnotationContainer.current.classList.remove("highlight-is-selected");
//             })
//         }
//     }

//     private changeHighlightColor(color: string, choiceColorButton: React.RefObject<HTMLButtonElement>): void {
//         this.setState({ highlightColor: color }, () => {
//             // Select the button on the front end, but start by deselecting all the others
//             for (const [, buttonRef] of Object.entries(this.highlightAnnotationToolbarColorChoiceButtons)) {
//                 if (buttonRef.current) {
//                     // Do something with buttonRef.current, e.g., remove a class
//                     buttonRef.current.classList.remove('selected-pallete-color');
//                 }
//             }

//             // Now select the chosen button
//             choiceColorButton.current?.classList.add("selected-pallete-color");
//         });
//     }

//     public getResizeRatio(scaleRatio: number) {
//         // Calculate new dimensions and offsets based on the magnifier
//         const newLeftOffset = this.state.leftOffset * scaleRatio;
//         const newTopOffset = this.state.topOffset * scaleRatio;
//         const newWidth = this.state.width * scaleRatio;
//         const newHeight = this.state.height * scaleRatio;

//         // Recalculate the clip path polygons - just goes through the point's string and multiples every point component by the scaleRatio
//         const newClipPathPolygons: [{ x: number, y: number }, { x: number, y: number }, { x: number, y: number }, { x: number, y: number }][] = this.state.clipPathPolygons.map((polygon) => {
//             // Parse the existing points and scale them by the magnifier
//             const points = polygon.props.points.split(',').map((point: string) => {
//                 const [x, y] = point.trim().split(' ').map(Number);
//                 return { x: x * scaleRatio, y: y * scaleRatio };
//             });

//             return points;
//         });

//         return {
//             leftOffset: newLeftOffset,
//             topOffset: newTopOffset,
//             width: newWidth,
//             height: newHeight,
//             clipPathPolygons: newClipPathPolygons,
//         }
//     }

//     public resize(scaleRatio: number): void {
//         // Calculate new dimensions and offsets based on the magnifier
//         const newLeftOffset = this.state.leftOffset * scaleRatio;
//         const newTopOffset = this.state.topOffset * scaleRatio;
//         const newWidth = this.state.width * scaleRatio;
//         const newHeight = this.state.height * scaleRatio;

//         // Adjust the toolbar position
//         const newToolbarLeftOffset = this.state.toolbarLeftOffset * scaleRatio;
//         const newToolbarTopOffset = this.state.toolbarTopOffset * scaleRatio;

//         // Recalculate the clip path polygons - just goes through the point's string and multiples every point component by the scaleRatio
//         const newClipPathPolygons = this.state.clipPathPolygons.map((polygon) => {
//             // Parse the existing points and scale them by the magnifier
//             const points = polygon.props.points.split(',').map((point: string) => {
//                 const [x, y] = point.trim().split(' ').map(Number);
//                 return `${x * scaleRatio} ${y * scaleRatio}`;
//             }).join(', ');

//             // Return a new polygon with the updated points
//             return <polygon points={points} key={Math.random()}></polygon>;
//         });

//         // Update the state with the new values
//         this.setState({
//             leftOffset: newLeftOffset,
//             topOffset: newTopOffset,
//             width: newWidth,
//             height: newHeight,
//             clipPathPolygons: newClipPathPolygons,
//             toolbarLeftOffset: newToolbarLeftOffset,
//             toolbarTopOffset: newToolbarTopOffset,
//         });
//     }

//     public componentDidMount(): void {
//         this.initialize();
//     }

//     public render(): React.ReactNode {
//         return (
//             <>  
//                 {/* Clip path that cuts out the highlighted text */}
//                 <svg className="pdf-page-highlight-clip-path-outline">
//                     <defs>
//                         <clipPath id={this.state.clipPathId}>
//                             {this.state.clipPathPolygons}
//                         </clipPath>
//                     </defs>
//                 </svg>
//                 {/* Highlight overlay that covers the text (is cut out by the clip path) */}
//                 <div className="pdf-page-hightlight-annotation-container" onClick={this.selectHighlightAnnotation.bind(this)} id={this.identifier.toString()} ref={this.highlightAnnotationContainer} style={{
//                     left: `${this.state.leftOffset}px`,
//                     top: `${this.state.topOffset}px`,
//                     width: `${this.state.width}px`,
//                     height: `${this.state.height}px`,
//                     backgroundColor: this.state.highlightColor,
//                     clipPath: `url('#${this.state.clipPathId}')`,
//                 }}></div>
//                 {/* Toolbar button to delete the highlight if needed by the user */}
//                 <div className="pdf-page-highlight-toolbar-container" style={{
//                     left: `${this.state.toolbarLeftOffset}px`, 
//                     top: `${this.state.toolbarTopOffset}px`,
//                     visibility: `${this.state.highlightIsSelected ? "visible" : "hidden"}`
//                 }}>
//                     <button style={{ backgroundColor: "yellow" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.yellowChoice} onClick={() => { this.changeHighlightColor("yellow", this.highlightAnnotationToolbarColorChoiceButtons.yellowChoice) }}></button>
//                     <button style={{ backgroundColor: "red" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.redChoice} onClick={() => { this.changeHighlightColor("red", this.highlightAnnotationToolbarColorChoiceButtons.redChoice) }}></button>
//                     <button style={{ backgroundColor: "blue" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.blueChoice} onClick={() => { this.changeHighlightColor("blue", this.highlightAnnotationToolbarColorChoiceButtons.blueChoice) }}></button>
//                     <button style={{ backgroundColor: "green" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.greenChoice} onClick={() => { this.changeHighlightColor("green", this.highlightAnnotationToolbarColorChoiceButtons.greenChoice) }}></button>
//                     <button style={{ backgroundColor: "purple" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.purpleChoice} onClick={() => { this.changeHighlightColor("purple", this.highlightAnnotationToolbarColorChoiceButtons.purpleChoice) }}></button>
//                     <button className="pdf-page-highlight-toolbar-button " onClick={() => { this.onRemove(this.identifier) }}>
//                         <img src={"/Components/PDFViewer/editor-toolbar-delete.svg"}></img>
//                     </button>
//                 </div>

//             </>
//         )
//     }
// }

// interface ImportedPDFPageHighlightAnnotationState {
//     topOffset: number;
//     leftOffset: number;
//     width: number;
//     height: number;
//     clipPathId: string;
//     clipPathPolygons: JSX.Element[];
//     toolbarTopOffset: number;
//     toolbarLeftOffset: number;

//     highlightIsSelected: boolean;
//     highlightColor: string;
// }

// class ImportedPDFPageHighlightAnnotation extends React.Component<ImportedPDFPageHighlightAnnotationProps, ImportedPDFPageHighlightAnnotationState> {
//     private highlightAnnotationContainer: React.RefObject<HTMLDivElement>;
//     private highlightData: AnnotationData;
//     private identifier: string | number;
//     private onRemove: (key: number | string) => void;

//     // On select, let the user change the color
//     private highlightAnnotationToolbarColorChoiceButtons: { 
//         yellowChoice: React.RefObject<HTMLButtonElement>, 
//         purpleChoice: React.RefObject<HTMLButtonElement>,
//         greenChoice: React.RefObject<HTMLButtonElement>,
//         redChoice: React.RefObject<HTMLButtonElement>,
//         blueChoice: React.RefObject<HTMLButtonElement>,
//     };

//     constructor(props: ImportedPDFPageHighlightAnnotationProps) {
//         super(props);
//         this.highlightAnnotationContainer = React.createRef<HTMLDivElement>();
//         this.highlightData = props.highlightData;
//         this.identifier = props.identifier;
//         this.onRemove = props.onRemove;

//         this.highlightAnnotationToolbarColorChoiceButtons = {
//             yellowChoice: React.createRef<HTMLButtonElement>(), 
//             purpleChoice: React.createRef<HTMLButtonElement>(),
//             greenChoice: React.createRef<HTMLButtonElement>(),
//             redChoice: React.createRef<HTMLButtonElement>(),
//             blueChoice: React.createRef<HTMLButtonElement>(),
//         }

//         this.state = {
//             topOffset: 0,
//             leftOffset: 0,
//             width: 0,
//             height: 0,

//             clipPathId: `to be set`,
//             clipPathPolygons: [],

//             toolbarTopOffset: 0,
//             toolbarLeftOffset: 0,

//             highlightIsSelected: false,
//             highlightColor: "to be set"
//         }
//     }

//     // Functions regarding initialization

//     private renderHighlightAnnotationFromData(): void {
//         // Pull from data and import
//         const data: AnnotationData = this.highlightData as AnnotationData;

//         // First, import the highlight polygons
//         const highlights: JSX.Element[] = [];
//         data.clipPathPolygonPoints.forEach((points: string) => {
//             highlights.push(<polygon points={points} key={Math.random()}></polygon>);
//         })

//         // Now load data
//         this.setState({
//             leftOffset: data.leftOffset, 
//             topOffset: data.topOffset, 
//             width: data.width, 
//             height: data.height, 

//             clipPathId: data.clipPathId,
//             clipPathPolygons: highlights,

//             toolbarLeftOffset: data.toolbarLeftOffset, 
//             toolbarTopOffset: data.toolbarTopOffset,

//             highlightColor: data.annotationColor
//         })
//     }


//     private renderSelectedColorInHighlightToolbar(): void {
//         // For the toolbar, just highlight the selected color!
//         const selectedColor: string = `${this.state.highlightColor}Choice`;

//         if (Object.prototype.hasOwnProperty.call(this.highlightAnnotationToolbarColorChoiceButtons, selectedColor)) {
//             const selectedChoice = this.highlightAnnotationToolbarColorChoiceButtons[selectedColor as keyof typeof this.highlightAnnotationToolbarColorChoiceButtons];
//             selectedChoice.current?.classList.add("highlight-selected-pallete-color");
//         }
//     }

//     private initialize(): void {  
//         this.renderHighlightAnnotationFromData();
//         this.renderSelectedColorInHighlightToolbar();
//     }

//     // Functions regarding the alive state

//     private selectHighlightAnnotation(event: React.MouseEvent<HTMLDivElement>): void {
//         const target = event.target as HTMLElement;

//         if (!target) {
//             return;
//         }

//         // If the click corresponds to this highlight, then we select it!
//         if (target.className == "pdf-page-hightlight-annotation-container" && target.id == this.identifier && !this.state.highlightIsSelected) {
//             this.setState({ highlightIsSelected: true }, () => {
//                 if (!this.highlightAnnotationContainer.current) {
//                     return;
//                 }

//                 this.highlightAnnotationContainer.current.classList.add("highlight-is-selected");
//             });

//             return;
//         }

//         // Otherwise, if previously selected, then we deselect!
//         if (this.state.highlightIsSelected) {
//             this.setState({ highlightIsSelected: false }, () => {
//                 if (!this.highlightAnnotationContainer.current) {
//                     return;
//                 }

//                 this.highlightAnnotationContainer.current.classList.remove("highlight-is-selected");
//             })
//         }
//     }

//     private changeHighlightColor(color: string, choiceColorButton: React.RefObject<HTMLButtonElement>): void {
//         this.setState({ highlightColor: color }, () => {
//             // Select the button on the front end, but start by deselecting all the others
//             for (const [, buttonRef] of Object.entries(this.highlightAnnotationToolbarColorChoiceButtons)) {
//                 if (buttonRef.current) {
//                     // Do something with buttonRef.current, e.g., remove a class
//                     buttonRef.current.classList.remove('selected-pallete-color');
//                 }
//             }

//             // Now select the chosen button
//             choiceColorButton.current?.classList.add("selected-pallete-color");
//         });
//     }

//     public getResizeRatio(scaleRatio: number) {
//         // Calculate new dimensions and offsets based on the magnifier
//         const newLeftOffset = this.state.leftOffset * scaleRatio;
//         const newTopOffset = this.state.topOffset * scaleRatio;
//         const newWidth = this.state.width * scaleRatio;
//         const newHeight = this.state.height * scaleRatio;

//         // Recalculate the clip path polygons - just goes through the point's string and multiples every point component by the scaleRatio
//         const newClipPathPolygons: [{ x: number, y: number }, { x: number, y: number }, { x: number, y: number }, { x: number, y: number }][] = this.state.clipPathPolygons.map((polygon) => {
//             // Parse the existing points and scale them by the magnifier
//             const points = polygon.props.points.split(',').map((point: string) => {
//                 const [x, y] = point.trim().split(' ').map(Number);
//                 return { x: x * scaleRatio, y: y * scaleRatio };
//             });

//             return points;
//         });

//         return {
//             leftOffset: newLeftOffset,
//             topOffset: newTopOffset,
//             width: newWidth,
//             height: newHeight,
//             clipPathPolygons: newClipPathPolygons,
//         }
//     }

//     public resize(scaleRatio: number): void {
//         // Calculate new dimensions and offsets based on the magnifier
//         const newLeftOffset = this.state.leftOffset * scaleRatio;
//         const newTopOffset = this.state.topOffset * scaleRatio;
//         const newWidth = this.state.width * scaleRatio;
//         const newHeight = this.state.height * scaleRatio;

//         // Adjust the toolbar position
//         const newToolbarLeftOffset = this.state.toolbarLeftOffset * scaleRatio;
//         const newToolbarTopOffset = this.state.toolbarTopOffset * scaleRatio;

//         // Recalculate the clip path polygons - just goes through the point's string and multiples every point component by the scaleRatio
//         const newClipPathPolygons = this.state.clipPathPolygons.map((polygon) => {
//             // Parse the existing points and scale them by the magnifier
//             const points = polygon.props.points.split(',').map((point: string) => {
//                 const [x, y] = point.trim().split(' ').map(Number);
//                 return `${x * scaleRatio} ${y * scaleRatio}`;
//             }).join(', ');

//             // Return a new polygon with the updated points
//             return <polygon points={points} key={Math.random()}></polygon>;
//         });

//         // Update the state with the new values
//         this.setState({
//             leftOffset: newLeftOffset,
//             topOffset: newTopOffset,
//             width: newWidth,
//             height: newHeight,
//             clipPathPolygons: newClipPathPolygons,
//             toolbarLeftOffset: newToolbarLeftOffset,
//             toolbarTopOffset: newToolbarTopOffset,
//         });
//     }

//     public componentDidMount(): void {
//         this.initialize();
//     }

//     public render(): React.ReactNode {
//         return (
//             <>  
//                 {/* Clip path that cuts out the highlighted text */}
//                 <svg className="pdf-page-highlight-clip-path-outline">
//                     <defs>
//                         <clipPath id={this.state.clipPathId}>
//                             {this.state.clipPathPolygons}
//                         </clipPath>
//                     </defs>
//                 </svg>
//                 {/* Highlight overlay that covers the text (is cut out by the clip path) */}
//                 <div className="pdf-page-hightlight-annotation-container" onClick={this.selectHighlightAnnotation.bind(this)} id={this.identifier.toString()} ref={this.highlightAnnotationContainer} style={{
//                     left: `${this.state.leftOffset}px`,
//                     top: `${this.state.topOffset}px`,
//                     width: `${this.state.width}px`,
//                     height: `${this.state.height}px`,
//                     backgroundColor: this.state.highlightColor,
//                     clipPath: `url('#${this.state.clipPathId}')`,
//                 }}></div>
//                 {/* Toolbar button to delete the highlight if needed by the user */}
//                 <div className="pdf-page-highlight-toolbar-container" style={{
//                     left: `${this.state.toolbarLeftOffset}px`, 
//                     top: `${this.state.toolbarTopOffset}px`,
//                     visibility: `${this.state.highlightIsSelected ? "visible" : "hidden"}`
//                 }}>
//                     <button style={{ backgroundColor: "yellow" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.yellowChoice} onClick={() => { this.changeHighlightColor("yellow", this.highlightAnnotationToolbarColorChoiceButtons.yellowChoice) }}></button>
//                     <button style={{ backgroundColor: "red" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.redChoice} onClick={() => { this.changeHighlightColor("red", this.highlightAnnotationToolbarColorChoiceButtons.redChoice) }}></button>
//                     <button style={{ backgroundColor: "blue" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.blueChoice} onClick={() => { this.changeHighlightColor("blue", this.highlightAnnotationToolbarColorChoiceButtons.blueChoice) }}></button>
//                     <button style={{ backgroundColor: "green" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.greenChoice} onClick={() => { this.changeHighlightColor("green", this.highlightAnnotationToolbarColorChoiceButtons.greenChoice) }}></button>
//                     <button style={{ backgroundColor: "purple" }} className="pdf-page-highlight-toolbar-button pdf-page-highlight-toolbar-color-change-button" ref={this.highlightAnnotationToolbarColorChoiceButtons.purpleChoice} onClick={() => { this.changeHighlightColor("purple", this.highlightAnnotationToolbarColorChoiceButtons.purpleChoice) }}></button>
//                     <button className="pdf-page-highlight-toolbar-button " onClick={() => { this.onRemove(this.identifier) }}>
//                         <img src={"/Components/PDFViewer/editor-toolbar-delete.svg"}></img>
//                     </button>
//                 </div>

//             </>
//         )
//     }
// }

export { PDFPageHighlightAnnotation, ImportedPDFPageHighlightAnnotation };