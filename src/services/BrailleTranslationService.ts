// Braille Translation Service
// Converts text to Grade 1 Braille using Unicode Braille patterns

export class BrailleTranslationService {
  // Braille Unicode patterns for letters (Grade 1)
  private static readonly brailleMap: { [key: string]: string } = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑',
    'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
    'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕',
    'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
    'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
    
    // Numbers (preceded by number sign ⠼)
    '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
    '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚',
    
    // Punctuation
    '.': '⠲', ',': '⠂', '?': '⠦', '!': '⠖', ':': '⠒', ';': '⠆',
    '-': '⠤', '(': '⠶', ')': '⠶', '"': '⠦', "'": '⠄',
    
    // Special characters
    ' ': '⠀', // Braille space
  };

  // Capital sign indicator
  private static readonly capitalSign = '⠠';

  /**
   * Converts text to Grade 1 Braille
   */
  static textToBraille(text: string): string {
    if (!text) return '';

    let brailleText = '';
    let isInNumber = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const lowerChar = char.toLowerCase();

      // Handle spaces
      if (char === ' ') {
        brailleText += this.brailleMap[' '];
        isInNumber = false;
        continue;
      }

      // Handle capital letters
      if (char !== lowerChar && this.brailleMap[lowerChar]) {
        brailleText += this.capitalSign + this.brailleMap[lowerChar];
        continue;
      }

      // Handle numbers
      if (/\d/.test(char)) {
        if (!isInNumber) {
          // Add number indicator only at the start of a number sequence
          isInNumber = true;
        }
        brailleText += this.brailleMap[char] || '⠀';
        continue;
      } else {
        isInNumber = false;
      }

      // Handle regular characters
      brailleText += this.brailleMap[lowerChar] || this.brailleMap[char] || '⠀';
    }

    return brailleText;
  }

  /**
   * Formats braille text for display with proper line breaks
   */
  static formatBrailleForDisplay(brailleText: string, maxLineLength: number = 40): string[] {
    if (!brailleText) return [];

    const words = brailleText.split('⠀'); // Split by braille space
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLineLength) {
        currentLine += (currentLine ? '⠀' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Demonstrates braille translation with sample text
   */
  static getSampleBraille(): string {
    const sampleText = "Hello World! This is braille text for video content.";
    return this.textToBraille(sampleText);
  }
}

export default BrailleTranslationService;