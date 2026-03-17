import html2canvas from 'html2canvas';

export const defaultCaptureOptions: Partial<Parameters<typeof html2canvas>[1]> = {
  backgroundColor: '#f8fafc',
  scale: 2,
  logging: false,
  useCORS: true,
  windowWidth: 1600,
  onclone: (clonedDoc: Document) => {
    const elements = clonedDoc.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.color && (style.color.includes('oklch') || style.color.includes('lab'))) {
        el.style.color = '#1e293b';
      }
      if (style.backgroundColor && (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('lab'))) {
        if (el.classList.contains('bg-white')) el.style.backgroundColor = '#ffffff';
        else if (el.classList.contains('bg-neutral-50')) el.style.backgroundColor = '#f8fafc';
        else el.style.backgroundColor = 'transparent';
      }
      if (style.borderColor && (style.borderColor.includes('oklch') || style.borderColor.includes('lab'))) {
        el.style.borderColor = '#e2e8f0';
      }
    }
  },
};

export type CopyResult = 'copied' | 'error';

/**
 * Copy a DOM element as a PNG image to the clipboard.
 * Must be called from a user gesture (click handler) to work on Safari.
 */
export async function copyImageToClipboard(
  element: HTMLElement,
  options?: Partial<Parameters<typeof html2canvas>[1]>,
): Promise<CopyResult> {
  try {
    const opts = { ...defaultCaptureOptions, ...options };

    // Safari-compatible: start clipboard write synchronously with a Promise-based blob
    const clipboardItem = new ClipboardItem({
      'image/png': html2canvas(element, opts).then(
        (canvas) =>
          new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('toBlob returned null'));
            }, 'image/png');
          }),
      ),
    });
    await navigator.clipboard.write([clipboardItem]);
    return 'copied';
  } catch (err) {
    console.error('Failed to copy image:', err);
    return 'error';
  }
}
