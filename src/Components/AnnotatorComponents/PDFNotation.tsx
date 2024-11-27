import * as React from "react";
import { NotationData } from "../../interfaces/NotationData";
import "./PDFNotation.css";

export interface PDFNotationAnnotationProps {
    identifier: number | string;
    textCommented: string;
    matchingColor: string;
    onRemove: (identifier: string | number) => void;
}

export interface ImportedPDFNotationAnnotationProps {
    identifier: number | string;
    commentData: NotationData;
    onRemove: (identifier: string | number) => void;
}

interface PDFNotationAnnotationState {
    width: number;
    height: number;
    textCommented: string;
    matchingColor: string;
}

abstract class NotationAnnotation<P extends PDFNotationAnnotationProps | ImportedPDFNotationAnnotationProps> extends React.Component<P, PDFNotationAnnotationState> {
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

    public changeNotationColor(newColor: string): void {
        this.setState({ matchingColor: newColor});
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

class PDFNotationAnnotation extends NotationAnnotation<PDFNotationAnnotationProps> {
    constructor(props: PDFNotationAnnotationProps) {
        super(props);
    }

    protected initialize(): void {
        this.setState({
            textCommented: this.props.textCommented,
            matchingColor: this.props.matchingColor
        })
    }
}

class ImportedPDFNotationAnnotation extends NotationAnnotation<ImportedPDFNotationAnnotationProps> {
    constructor(props: ImportedPDFNotationAnnotationProps) {
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

export { PDFNotationAnnotation, ImportedPDFNotationAnnotation }