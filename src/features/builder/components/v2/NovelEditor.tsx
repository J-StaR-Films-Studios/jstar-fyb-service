'use client';

import { useEffect, useState, useRef } from 'react';
import {
    EditorRoot,
    EditorContent,
    type EditorInstance,
    StarterKit,
    HorizontalRule,
    Placeholder,
    TiptapLink,
    TiptapUnderline,
    TextStyle,
    Color,
    TaskItem,
    TaskList,
    HighlightExtension,
    TiptapImage,
} from 'novel';
import { Markdown } from 'tiptap-markdown';

interface NovelEditorProps {
    content: string; // Markdown string
    onUpdate: (content: string) => void;
    projectId: string;
    className?: string;
    onEditorReady?: (editor: EditorInstance) => void;
}

// Extensions with Markdown support
const extensions = [
    StarterKit.configure({
        bulletList: {
            HTMLAttributes: {
                class: 'list-disc list-outside ml-4',
            },
        },
        orderedList: {
            HTMLAttributes: {
                class: 'list-decimal list-outside ml-4',
            },
        },
        heading: {
            levels: [1, 2, 3, 4],
            HTMLAttributes: {
                class: 'font-bold',
            },
        },
        bold: {
            HTMLAttributes: {
                class: 'font-bold',
            },
        },
        italic: {
            HTMLAttributes: {
                class: 'italic',
            },
        },
    }),
    HorizontalRule,
    Placeholder.configure({
        placeholder: 'Start writing your chapter...',
        emptyNodeClass: 'text-gray-600',
    }),
    TiptapLink.configure({
        HTMLAttributes: {
            class: 'text-primary underline',
        },
    }),
    TiptapUnderline,
    TextStyle,
    Color,
    TaskItem.configure({
        nested: true,
    }),
    TaskList,
    HighlightExtension,
    TiptapImage.configure({
        HTMLAttributes: {
            class: 'rounded-lg max-w-full',
        },
    }),
    // Markdown extension for parsing and serializing
    Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
    }),
];

export function NovelEditor({ content, onUpdate, projectId, className, onEditorReady }: NovelEditorProps) {
    const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
    const initialContentRef = useRef<string>(content);
    const hasInitialized = useRef(false);

    // Set initial content when editor is ready
    useEffect(() => {
        if (editorInstance && !hasInitialized.current && content) {
            // Use the markdown extension to parse content
            editorInstance.commands.setContent(content);
            hasInitialized.current = true;
        }
    }, [editorInstance, content]);

    // Sync content when it changes externally (e.g., chapter switching)
    useEffect(() => {
        if (editorInstance && hasInitialized.current) {
            // Check if the new content is different from what's in the editor
            const currentContent = editorInstance.storage.markdown?.getMarkdown?.() || '';

            // Only update if content prop changed significantly (different chapter)
            if (content !== initialContentRef.current) {
                editorInstance.commands.setContent(content);
                initialContentRef.current = content;
            }
        }
    }, [content, editorInstance]);

    const handleUpdate = ({ editor }: { editor: EditorInstance }) => {
        if (!editorInstance) {
            setEditorInstance(editor);
            onEditorReady?.(editor);
        }

        // Get markdown from the editor using the markdown extension
        const markdown = editor.storage.markdown?.getMarkdown?.() || editor.getText();
        onUpdate(markdown);
    };

    const handleCreate = ({ editor }: { editor: EditorInstance }) => {
        setEditorInstance(editor);
        onEditorReady?.(editor);

        // Set initial content when editor is created
        if (content) {
            editor.commands.setContent(content);
            hasInitialized.current = true;
        }
    };

    return (
        <div className={`novel-editor-wrapper w-full h-full ${className || ''}`}>
            <EditorRoot>
                <EditorContent
                    initialContent={undefined}
                    extensions={extensions as any}
                    className="prose prose-invert prose-lg max-w-none min-h-[500px] w-full focus:outline-none"
                    editorProps={{
                        attributes: {
                            class: 'prose prose-invert prose-lg max-w-none min-h-[500px] w-full bg-transparent text-gray-300 font-serif text-lg leading-loose focus:outline-none p-0',
                        },
                    }}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    slotAfter={null}
                >
                    {/* No children needed */}
                </EditorContent>
            </EditorRoot>
        </div>
    );
}
