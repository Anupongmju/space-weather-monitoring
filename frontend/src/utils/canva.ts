/**
 * Parses a Canva URL or HTML embed code to extract the iframe source URL
 * and the original aspect ratio (if specified in the style).
 * 
 * @param {string} input - Canva link or HTML embed code
 * @returns {object} { url, aspectRatio, isEmbeddable }
 */
export const extractCanvaInfo = (input: string): { url: string; aspectRatio: string; isEmbeddable: boolean } => {
  if (!input) {
    return { url: '', aspectRatio: '112.4%', isEmbeddable: false };
  }

  const str = input.trim();

  // If the input is an HTML embed code block
  if (str.startsWith('<') || str.includes('<iframe')) {
    // 1. Extract iframe src
    const srcMatch = str.match(/src="([^"]+)"/);
    let url = srcMatch ? srcMatch[1] : '';

    // 2. Extract padding-top or padding-bottom for aspect ratio
    const paddingMatch = str.match(/padding-top:\s*([\d\.]+%)/) || str.match(/padding-bottom:\s*([\d\.]+%)/);
    const aspectRatio = paddingMatch ? paddingMatch[1] : '112.4%';

    return {
      url,
      aspectRatio,
      isEmbeddable: url.includes('canva.com/design/')
    };
  }

  // If the input is just a raw URL
  const isEmbed = str.includes('canva.com/design/');
  let url = str;
  if (isEmbed && !str.includes('?embed') && !str.includes('&embed')) {
    if (str.includes('/view')) {
      url = str.replace('/view', '/view?embed');
    }
  }

  return {
    url,
    aspectRatio: '112.4%', // Default to a standard 4:3-ish aspect ratio
    isEmbeddable: isEmbed
  };
};
