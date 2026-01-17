import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image,
  Svg
} from '@react-pdf/renderer';
import mermaid from 'mermaid';

export interface PdfExportOptions {
  title?: string;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  margin?: number;
  includePageNumbers?: boolean;
  includeTitle?: boolean;
}

const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  fontSize: 12,
  lineHeight: 1.5,
  fontFamily: 'Times New Roman',
  margin: 40,
  includePageNumbers: true,
  includeTitle: true,
};

const createStyles = (options: PdfExportOptions) => StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: options.margin || 40,
    fontFamily: options.fontFamily || 'Times New Roman',
    fontSize: options.fontSize || 12,
    lineHeight: options.lineHeight || 1.5,
  },
  title: {
    fontSize: (options.fontSize || 12) + 8,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  heading1: {
    fontSize: (options.fontSize || 12) + 6,
    marginBottom: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  heading2: {
    fontSize: (options.fontSize || 12) + 4,
    marginBottom: 12,
    fontWeight: 'bold',
    marginTop: 15,
  },
  heading3: {
    fontSize: (options.fontSize || 12) + 2,
    marginBottom: 10,
    fontWeight: 'bold',
    marginTop: 12,
  },
  heading4: {
    fontSize: options.fontSize || 12,
    marginBottom: 8,
    fontWeight: 'bold',
    marginTop: 10,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  listItem: {
    marginBottom: 5,
    marginLeft: 20,
  },
  image: {
    marginBottom: 10,
    objectFit: 'contain',
  },
  diagram: {
    marginBottom: 15,
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
  },
  horizontalRule: {
    borderBottom: '1px solid #000000',
    marginTop: 10,
    marginBottom: 10,
  },
});

const PdfDocument: React.FC<{ 
  content: string; 
  title?: string; 
  options: PdfExportOptions;
}> = ({ content, title, options }) => {
  const styles = createStyles(options);
  const [elements, setElements] = React.useState<React.ReactNode[]>([]);

  React.useEffect(() => {
    const parseElements = async () => {
      const lines = content.split('\n');
      const parsedElements: React.ReactNode[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          parsedElements.push(<Text key={'empty-' + i} style={styles.paragraph}>{"\n"}</Text>);
          continue;
        }

        // Headers
        if (trimmed.startsWith('# ')) {
          parsedElements.push(
            <Text key={'h1-' + i} style={styles.heading1}>
              {trimmed.substring(2)}
            </Text>
          );
        } else if (trimmed.startsWith('## ')) {
          parsedElements.push(
            <Text key={'h2-' + i} style={styles.heading2}>
              {trimmed.substring(3)}
            </Text>
          );
        } else if (trimmed.startsWith('### ')) {
          parsedElements.push(
            <Text key={'h3-' + i} style={styles.heading3}>
              {trimmed.substring(4)}
            </Text>
          );
        } else if (trimmed.startsWith('#### ')) {
          parsedElements.push(
            <Text key={'h4-' + i} style={styles.heading4}>
              {trimmed.substring(5)}
            </Text>
          );
        }
        // Lists
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          parsedElements.push(
            <Text key={'list-' + i} style={styles.listItem}>
              • {trimmed.substring(2)}
            </Text>
          );
        } else if (/^\d+\.\s/.test(trimmed)) {
          parsedElements.push(
            <Text key={'ordered-list-' + i} style={styles.listItem}>
              {trimmed.replace(/^\d+\.\s/, '$1. ')}
            </Text>
          );
        }
        // Horizontal rules
        else if (trimmed === '---' || trimmed === '***') {
          parsedElements.push(<View key={'hr-' + i} style={styles.horizontalRule}><Text>—</Text></View>);
        }
        // Regular paragraphs
        else {
          parsedElements.push(
            <Text key={'p-' + i} style={styles.paragraph}>
              {trimmed}
            </Text>
          );
        }
      }

      setElements(parsedElements);
    };

    parseElements();
  }, [content, options, styles]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {options.includeTitle && title && (
          <Text style={styles.title}>{title}</Text>
        )}
        {elements}
        {options.includePageNumbers && (
          <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
        )}
      </Page>
    </Document>
  );
};

const sanitizeContent = (content: string): string => {
  return content
    .replace(/—/g, ', ')
    .replace(/\\([:;,.!?])/g, '$1')
    .replace(/:\\[\s]?/g, ': ')
    .replace(/\\$/gm, '')
    .replace(/\\\\/g, '\\');
};

export const generatePdfBlob = async (
  content: string, 
  title?: string, 
  userOptions?: PdfExportOptions
): Promise<Blob> => {
  try {
    if (!content.trim()) {
      throw new Error('Content is empty');
    }

    const contentSize = new Blob([content]).size;
    if (contentSize > 10 * 1024 * 1024) {
      throw new Error('Content too large for PDF export');
    }

    const options = { ...DEFAULT_PDF_OPTIONS, ...userOptions };
    const cleanedContent = sanitizeContent(content);

    const { pdf } = await import('@react-pdf/renderer');
    
    return await pdf(
      <PdfDocument content={cleanedContent} title={title} options={options} />
    ).toBlob();
  } catch (error) {
    console.error('PDF generation error:', error);
    
    if (error instanceof Error) {
      throw new Error(`PDF export failed: ${error.message}`);
    }
    throw new Error('Unknown PDF export error');
  }
};

export const downloadPdf = async (
  content: string, 
  filename: string, 
  title?: string, 
  options?: PdfExportOptions
): Promise<void> => {
  try {
    const blob = await generatePdfBlob(content, title, options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};