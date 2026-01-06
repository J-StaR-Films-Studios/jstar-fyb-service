'use client';

import { useEffect, useState, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import {
    EditorRoot,
    EditorContent,
    type EditorInstance,
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
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import { TableBubbleMenu } from './TableBubbleMenu';

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
            levels: [1, 2, 3, 4, 5, 6],
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
    Table.configure({
        resizable: true,
        HTMLAttributes: {
            class: 'border-collapse table-auto w-full my-4 border border-gray-700 rounded-lg overflow-hidden',
        },
    }),
    TableRow.configure({
        HTMLAttributes: {
            class: 'border-b border-gray-700',
        },
    }),
    TableHeader.configure({
        HTMLAttributes: {
            class: 'bg-white/5 font-bold p-3 text-left border-r border-gray-700 last:border-0',
        },
    }),
    TableCell.configure({
        HTMLAttributes: {
            class: 'p-3 border-r border-gray-700 last:border-0',
        },
    }),
    // Markdown extension for parsing and serializing
    Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
    }),
    BubbleMenu.configure({
        pluginKey: 'table-bubble-menu',
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
            // Only update if content prop is different from what we last initialized/synced
            // AND ensure we don't overwrite if the editor content matches (to avoid cursor jump)
            if (content !== initialContentRef.current) {
                const currentEditorMarkdown = editorInstance.storage.markdown?.getMarkdown?.() || '';

                // If the new content is exactly what's already in the editor (e.g. from typing), ignore
                if (content === currentEditorMarkdown) {
                    initialContentRef.current = content; // Just update ref
                    return;
                }

                // If content is truly different (external switch), update editor
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
                    <TableBubbleMenu editor={editorInstance as any} />
                </EditorContent>
            </EditorRoot>
        </div>
    );
}
