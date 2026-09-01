import React, { useMemo } from 'react';

interface VoucherQRCodeProps {
  code: string;
  size?: number;
  className?: string;
}

export const VoucherQRCode: React.FC<VoucherQRCodeProps> = ({
  code,
  size = 130,
  className = '',
}) => {
  // Generate deterministic 21x21 QR matrix based on code string
  const matrix = useMemo(() => {
    const matrixSize = 21;
    const grid: boolean[][] = Array.from({ length: matrixSize }, () =>
      Array(matrixSize).fill(false)
    );

    // 1. Draw 7x7 Position Finder Patterns on (0,0), (14,0), (0,14)
    const drawFinderPattern = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // Outer ring
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // Inner solid 3x3
          ) {
            grid[startRow + r][startCol + c] = true;
          } else {
            grid[startRow + r][startCol + c] = false;
          }
        }
      }
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(0, 14);
    drawFinderPattern(14, 0);

    // 2. Draw Timing Patterns (row 6 and col 6)
    for (let i = 8; i < 13; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // 3. Populate data modules using hash bytes from code
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash << 5) - hash + code.charCodeAt(i);
      hash |= 0;
    }

    let seed = Math.abs(hash) || 1234567;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        // Skip finder pattern zones
        const inFinder1 = r < 8 && c < 8;
        const inFinder2 = r < 8 && c >= 13;
        const inFinder3 = r >= 13 && c < 8;
        const isTiming = (r === 6 && (c < 14 || c > 6)) || (c === 6 && (r < 14 || r > 6));

        if (!inFinder1 && !inFinder2 && !inFinder3 && !isTiming) {
          grid[r][c] = lcg() > 0.48;
        }
      }
    }

    return grid;
  }, [code]);

  return (
    <div
      className={`inline-flex items-center justify-center bg-white p-2.5 rounded-xl shadow-md border border-zinc-200 ${className}`}
      style={{ width: size + 20, height: size + 20 }}
    >
      <svg
        viewBox="0 0 21 21"
        width={size}
        height={size}
        style={{ shapeRendering: 'crispEdges' }}
      >
        {matrix.map((row, r) =>
          row.map((isDark, c) =>
            isDark ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="#09090b"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
