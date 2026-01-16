import StarterKit from '@tiptap/starter-kit';
import {
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
import { MermaidExtension } from './MermaidExtension';

export const defaultExtensions = [
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
    MermaidExtension,
];
