import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey, Transaction, EditorState } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
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

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^```mermaid$/,
        type: this.type,
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mermaid-transformer'),
        appendTransaction: (transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) => {
          const { tr } = newState;
          let modified = false;

          // Iterate through all nodes to find codeBlocks with language="mermaid"
          newState.doc.descendants((node: ProseMirrorNode, pos: number) => {
            // specific check for codeBlock with language mermaid
            if (node.type.name === 'codeBlock' && node.attrs.language === 'mermaid') {
              const code = node.textContent;

              // Create the mermaid node
              const mermaidNode = this.type.create({
                code,
                title: 'Diagram',
              });

              // Replace codeBlock with mermaidNode
              tr.replaceWith(pos, pos + node.nodeSize, mermaidNode);
              modified = true;
            }
          });

          if (modified) {
            return tr;
          }
          return null;
        },
      }),
    ];
  },
});
