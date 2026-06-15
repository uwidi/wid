import { CryptoType } from '../types';

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatCrypto(amount: number, type: CryptoType): string {
  const precision = type === 'BTC' ? 6 : type === 'ETH' ? 5 : type === 'SOL' ? 3 : 2;
  return Number(amount).toFixed(precision) + ' ' + type;
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

export function generateTxHash(type: CryptoType): string {
  const chars = '0123456789abcdef';
  let hashLength = 64; // SHA-256 length hash
  let prefix = '0x';
  
  if (type === 'SOL') {
    // Solana uses base58 hashes
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    for (let i = 0; i < 88; i++) {
      hash += base58Chars.charAt(Math.floor(Math.random() * base58Chars.length));
    }
    return hash;
  }

  // BTC & ETH standard hex
  let hash = '';
  for (let i = 0; i < hashLength; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return type === 'BTC' ? hash : prefix + hash;
}

/**
 * Generates an SVG path or pattern to represent a realistic QR Code
 * based on payload string, to avoid installing massive libraries.
 */
export function generateQRPlaceholderSvg(payload: string): { svgPath: string; dots: string[] } {
  // Let's create a procedural grid design representing a QR code.
  // This is highly performant and stylish.
  const hash = Array.from(payload).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const size = 25; // 25x25 grid
  const list: string[] = [];

  // Generate deterministic grid pattern with anchor blocks at the corners
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Finder patterns (relative positions of 3 main outer squares)
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= size - 7;
      const isBottomLeft = r >= size - 7 && c < 7;
      
      if (isTopLeft || isTopRight || isBottomLeft) {
        // Outer border of finder pattern
        const isBorder = (r === 0 || r === 6 || c === 0 || c === 6) && isTopLeft ||
                         (r === 0 || r === 6 || c === size - 1 || c === size - 7) && isTopRight ||
                         (r === size - 1 || r === size - 7 || c === 0 || c === 6) && isBottomLeft;
        
        // Inner 3x3 solid block of finder pattern
        const isInnerFill = (r >= 2 && r <= 4 && c >= 2 && c <= 4) && isTopLeft ||
                            (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) && isTopRight ||
                            (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) && isBottomLeft;
        
        if (isBorder || isInnerFill) {
          list.push(`${r},${c}`);
        }
      } else {
        // Procedural noise for the rest of the QR content, deterministic based on hash and index
        const rand = Math.sin((r * 12.9898 + c * 78.233 + hash) * 43758.5453123);
        const val = rand - Math.floor(rand);
        if (val > 0.46) {
          list.push(`${r},${c}`);
        }
      }
    }
  }

  return {
    svgPath: '', // Will draw dot grids on UI
    dots: list
  };
}
