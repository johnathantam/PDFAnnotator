import * as React from "react";
import { CommentData } from "../../interfaces/CommentData";
import "./PDFComments.css";

interface PDFPageCommentAnnotationProps {
    identifier: number | string;
    textCommented: string;
    matchingColor: string;
    onRemove: (identifier: string | number) => void;
}

interface ImportedPDFPageCommentAnnotationProps {
    identifier: number | string;
    commentData: CommentData;
    onRemove: (identifier: string | number) => void;
}

interface PDFPageCommentAnnotationState {
    width: number;
    height: number;
    textCommented: string;
    matchingColor: string;
}

abstract class CommentAnnotation<
    P extends PDFPageCommentAnnotationProps | ImportedPDFPageCommentAnnotationProps
> extends React.Component<P, PDFPageCommentAnnotationState> {
    protected PDFCommentContainer: React.RefObject<HTMLDivElement>;
    protected PDFCommentAnnotationTextArea: React.RefObject<HTMLTextAreaElement>;

    protected identifier: number | string;
    protected onRemove: (identifier: string | number) => void;
    
    constructor(props: P) {
        super(props);
        this.PDFCommentContainer = React.createRef<HTMLDivElement>();
        this.PDFCommentAnnotationTextArea = React.createRef<HTMLTextAreaElement>();

        this.identifier = props.identifier;
        this.onRemove = props.onRemove;

        this.state = {
            width: 250,
            height: 69,
            textCommented: "",
            matchingColor: "",
        };
    }

    protected abstract initialize(): void;

    protected resizeTextArea(): void {
        const textarea = this.PDFCommentAnnotationTextArea.current;

        if (!textarea) return;

        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        this.setState({ height: this.PDFCommentContainer.current?.clientHeight || 0 });
    }

    public getTextCommented(): string {
        return this.state.textCommented;
    }

    public getComment(): string {
        return this.PDFCommentAnnotationTextArea.current?.value || "";
    }

    public componentDidMount(): void {
        this.initialize();
    }

    public render(): React.ReactNode {
        return (
            <div className="pdf-page-comment-container" ref={this.PDFCommentContainer}>
                <div className="pdf-page-comment-header-container">
                    <i 
                        className="pdf-page-comment-header-icon" 
                        onClick={() => this.onRemove(this.identifier)} 
                        style={{ backgroundColor: this.state.matchingColor }}
                    ></i>
                    <p className="pdf-page-comment-header-title">
                        Annotated: [ {this.state.textCommented} ]
                    </p>
                </div>
                <textarea 
                    className="pdf-page-comment-textarea" 
                    ref={this.PDFCommentAnnotationTextArea} 
                    onInput={this.resizeTextArea.bind(this)} 
                    rows={1} 
                    placeholder="Type your comment here!"
                />
            </div>
        );
    }
}

class PDFPageCommentAnnotation extends CommentAnnotation<PDFPageCommentAnnotationProps> {
    constructor(props: PDFPageCommentAnnotationProps) {
        super(props);
    }

    protected initialize(): void {
        this.setState({
            textCommented: this.props.textCommented,
            matchingColor: this.props.matchingColor
        })
    }
}

class ImportedPDFPageCommentAnnotation extends CommentAnnotation<ImportedPDFPageCommentAnnotationProps> {
    constructor(props: ImportedPDFPageCommentAnnotationProps) {
        super(props)
    }

    protected initialize(): void {
        // Import and load preexisting data
        this.setState({
            textCommented: this.props.commentData.textCommented,
            matchingColor: this.props.commentData.matchingColor
        });

        if (!this.PDFCommentAnnotationTextArea.current) {
            return;
        }

        // Load saved comment and resize the text area to fit it!
        this.PDFCommentAnnotationTextArea.current.value = this.props.commentData.comment;
        this.resizeTextArea();
    }
}

// class PDFPageCommentAnnotation extends React.Component<PDFPageCommentAnnotationProps, PDFPageCommentAnnotationState> {
//     private PDFCommentContainer: React.RefObject<HTMLDivElement>;
//     private PDFCommentAnnotationTextArea: React.RefObject<HTMLTextAreaElement>;

//     private identifier: number | string;
//     private onRemove: (identifier: string | number) => void;
    
//     constructor(props: PDFPageCommentAnnotationProps) {
//         super(props);
//         this.PDFCommentContainer = React.createRef<HTMLDivElement>();
//         this.PDFCommentAnnotationTextArea = React.createRef<HTMLTextAreaElement>();

//         this.identifier = props.identifier;
//         this.onRemove = props.onRemove;

//         this.state = {
//             width: 250,
//             height: 69,
//             textCommented: props.textCommented,
//             matchingColor: props.matchingColor
//         }
//     }

//     // Functions regarding the alive state

//     private resizeTextArea(): void {
//         const textarea = this.PDFCommentAnnotationTextArea.current;

//         if (!textarea) {
//             return;
//         }

//         // Reset the height to auto to shrink if needed
//         textarea.style.height = 'auto';
//         // Set the height based on the scrollHeight
//         textarea.style.height = `${textarea.scrollHeight}px`;
//         // Store dynamic height as a variable for access
//         this.setState({ height: (this.PDFCommentContainer.current) ? this.PDFCommentContainer.current.clientHeight : 0 });
//     }

//     public getTextCommented(): string {
//         return this.state.textCommented;
//     }

//     public getComment(): string {
//         if (!this.PDFCommentAnnotationTextArea.current) {
//             return "";
//         }

//         return this.PDFCommentAnnotationTextArea.current.value;
//     }

//     public render(): React.ReactNode {
//         return (
//             <div className="pdf-page-comment-container" ref={this.PDFCommentContainer}>
//                 <div className="pdf-page-comment-header-container">
//                     <i className="pdf-page-comment-header-icon" onClick={() => this.onRemove(this.identifier)} style={{ backgroundColor: this.state.matchingColor }}></i>
//                     <p className="pdf-page-comment-header-title">Annotated: [ {this.state.textCommented} ]</p>
//                 </div>
//                 <textarea className="pdf-page-comment-textarea" ref={this.PDFCommentAnnotationTextArea} onInput={this.resizeTextArea.bind(this)} rows={1} placeholder="Type your comment here!">
                    
//                 </textarea>
//             </div>
//         )
//     }
// }

// interface ImportedPDFPageCommentAnnotationState {
//     width: number;
//     height: number;
//     textCommented: string;
//     matchingColor: string;
// }

// class ImportedPDFPageCommentAnnotation extends React.Component<ImportedPDFPageCommentAnnotationProps, ImportedPDFPageCommentAnnotationState> {
//     private PDFCommentContainer: React.RefObject<HTMLDivElement>;
//     private PDFCommentAnnotationTextArea: React.RefObject<HTMLTextAreaElement>;

//     private identifier: number | string;
//     private commentData: CommentData;
//     private onRemove: (identifier: string | number) => void;
    
//     constructor(props: ImportedPDFPageCommentAnnotationProps) {
//         super(props);
//         this.PDFCommentContainer = React.createRef<HTMLDivElement>();
//         this.PDFCommentAnnotationTextArea = React.createRef<HTMLTextAreaElement>();
        
//         this.identifier = props.identifier;
//         this.commentData = props.commentData;
//         this.onRemove = props.onRemove;

//         this.state = {
//             width: 250,
//             height: 69,
//             textCommented: "to be set",
//             matchingColor: "to be set"
//         }
//     }

//     // Functions regarding initialization

//     private renderImportedCommentData(): void {
//         this.setState({
//             textCommented: this.commentData.textCommented,
//             matchingColor: this.commentData.matchingColor
//         });

//         if (!this.PDFCommentAnnotationTextArea.current) {
//             return;
//         }

//         this.PDFCommentAnnotationTextArea.current.value = this.commentData.comment;
//     }

//     // Functions regarding the alive state

//     private resizeTextArea(): void {
//         const textarea = this.PDFCommentAnnotationTextArea.current;

//         if (!textarea) {
//             return;
//         }

//         // Reset the height to auto to shrink if needed
//         textarea.style.height = 'auto';
//         // Set the height based on the scrollHeight
//         textarea.style.height = `${textarea.scrollHeight}px`;
//         // Store dynamic height as a variable for access
//         this.setState({ height: (this.PDFCommentContainer.current) ? this.PDFCommentContainer.current.clientHeight : 0 });
//     }

//     public getTextCommented(): string {
//         return this.state.textCommented;
//     }

//     public getComment(): string {
//         if (!this.PDFCommentAnnotationTextArea.current) {
//             return "";
//         }

//         return this.PDFCommentAnnotationTextArea.current.value;
//     }


//     public componentDidMount(): void {
//         this.renderImportedCommentData();
//     }

//     public render(): React.ReactNode {
//         return (
//             <div className="pdf-page-comment-container" ref={this.PDFCommentContainer}>
//                 <div className="pdf-page-comment-header-container">
//                     <i className="pdf-page-comment-header-icon" onClick={() => this.onRemove(this.identifier)} style={{ backgroundColor: this.state.matchingColor }}></i>
//                     <p className="pdf-page-comment-header-title">Annotated: [ {this.state.textCommented} ]</p>
//                 </div>
//                 <textarea className="pdf-page-comment-textarea" ref={this.PDFCommentAnnotationTextArea} onInput={this.resizeTextArea.bind(this)} rows={1} placeholder="Type your comment here!">
                    
//                 </textarea>
//             </div>
//         )
//     }
// }


export { PDFPageCommentAnnotation, ImportedPDFPageCommentAnnotation }