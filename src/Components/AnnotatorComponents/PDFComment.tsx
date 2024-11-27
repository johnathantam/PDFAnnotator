import * as React from "react";
import { ImportedPDFNotationAnnotationProps, ImportedPDFNotationAnnotation, PDFNotationAnnotation, PDFNotationAnnotationProps } from "./PDFNotation";
import { ImportedPDFPageHighlightAnnotationProps, ImportedPDFPageHighlightAnnotation, PDFPageHighlightAnnotation, PDFPageHighlightAnnotationProps } from "./PDFHighlights";

interface PDFPageCommentProps {
    PDFNotationProps: PDFNotationAnnotationProps,
    PDFHighlightProps: PDFPageHighlightAnnotationProps,
    identifier: string | number;
}

interface ImportedPDFPageCommentProps {
    PDFNotationProps: ImportedPDFNotationAnnotationProps,
    PDFHighlightProps: ImportedPDFPageHighlightAnnotationProps,
    identifier: string | number;
}

class PDFPageComment {
    private _PDFCommentNotationRef: React.RefObject<PDFNotationAnnotation> = React.createRef<PDFNotationAnnotation>();
    private _PDFCommentNotationElement: JSX.Element;
    private _PDFCommentHighlightRef: React.RefObject<PDFPageHighlightAnnotation> = React.createRef<PDFPageHighlightAnnotation>();
    private _PDFCommentHighlightElement: JSX.Element;

    private _identifier: string | number;

    constructor(props: PDFPageCommentProps) {
        this._PDFCommentHighlightElement = <PDFPageHighlightAnnotation
            identifier={props.PDFHighlightProps.identifier}
            range={props.PDFHighlightProps.range}
            highlightColor={props.PDFHighlightProps.highlightColor}
            onRemove={props.PDFHighlightProps.onRemove}
            key={Date.now()}
            onColorChange={this.changeCommentColor.bind(this)}
            ref={this._PDFCommentHighlightRef}
        >
        </PDFPageHighlightAnnotation>

        this._PDFCommentNotationElement = <PDFNotationAnnotation 
            identifier={props.PDFNotationProps.identifier} 
            textCommented={props.PDFNotationProps.textCommented}
            matchingColor={props.PDFNotationProps.matchingColor}
            onRemove={props.PDFNotationProps.onRemove}
            key={Date.now()}
            ref={this._PDFCommentNotationRef}
        ></PDFNotationAnnotation>

        this._identifier  = props.identifier;
    }

    public get PDFCommentNotationRef(): React.RefObject<PDFNotationAnnotation> {
        return this._PDFCommentNotationRef;
    }

    public get PDFCommentNotationElement(): JSX.Element {
        return this._PDFCommentNotationElement;
    }

    public get PDFCommentHighlightRef(): React.RefObject<PDFPageHighlightAnnotation> {
        return this._PDFCommentHighlightRef;
    }
    
    public get PDFCommentHighlightElement(): JSX.Element {
        return this._PDFCommentHighlightElement;
    }

    public get identifier(): string | number {
        return this._identifier;
    }

    private changeCommentColor(newColor: string): void {
        this._PDFCommentNotationRef.current?.changeNotationColor(newColor);
    }
}

class ImportedPDFPageComment {
    private _PDFCommentNotationRef: React.RefObject<ImportedPDFNotationAnnotation> = React.createRef<ImportedPDFNotationAnnotation>();
    private _PDFCommentNotationElement: JSX.Element;
    private _PDFCommentHighlightRef: React.RefObject<ImportedPDFPageHighlightAnnotation> = React.createRef<ImportedPDFPageHighlightAnnotation>();
    private _PDFCommentHighlightElement: JSX.Element;

    private _identifier: string | number;

    constructor(props: ImportedPDFPageCommentProps) {
        this._PDFCommentHighlightElement = <ImportedPDFPageHighlightAnnotation
            identifier={props.PDFHighlightProps.identifier}
            highlightData={props.PDFHighlightProps.highlightData}
            onColorChange={this.changeCommentColor.bind(this)}
            onRemove={props.PDFHighlightProps.onRemove}
            ref={this._PDFCommentHighlightRef}
            key={Date.now()}
        >
        </ImportedPDFPageHighlightAnnotation>

        this._PDFCommentNotationElement = <ImportedPDFNotationAnnotation
            identifier={props.PDFHighlightProps.identifier}
            onRemove={props.PDFNotationProps.onRemove}
            commentData={props.PDFNotationProps.commentData}
            ref={this._PDFCommentNotationRef}
            key={Date.now()}
        >
        </ImportedPDFNotationAnnotation>

        this._identifier  = props.identifier;
    }

    public get PDFCommentNotationRef(): React.RefObject<ImportedPDFNotationAnnotation> {
        return this._PDFCommentNotationRef;
    }

    public get PDFCommentNotationElement(): JSX.Element {
        return this._PDFCommentNotationElement;
    }

    public get PDFCommentHighlightRef(): React.RefObject<ImportedPDFPageHighlightAnnotation> {
        return this._PDFCommentHighlightRef;
    }
    
    public get PDFCommentHighlightElement(): JSX.Element {
        return this._PDFCommentHighlightElement;
    }

    public get identifier(): string | number {
        return this._identifier;
    }

    private changeCommentColor(newColor: string): void {
        this._PDFCommentNotationRef.current?.changeNotationColor(newColor);
    }
}

export { PDFPageComment, ImportedPDFPageComment }