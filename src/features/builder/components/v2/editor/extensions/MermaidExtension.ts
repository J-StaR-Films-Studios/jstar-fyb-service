import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidNodeView } from './MermaidNodeView';

export const MermaidExtension = Node.create({
  name: 'mermaidDiagram',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      code: {
        default: '',
      },
      title: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mermaid-diagram',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mermaid-diagram', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },
});
