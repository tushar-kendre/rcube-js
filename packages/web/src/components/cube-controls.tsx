import { MoveNotation } from "@/types/cube-core";
import { CubieMoveNotation } from "@/types/cubie";
import { useEffect, useState } from "react";

/**
 * Props interface for the CubeControls component
 */
interface CubeControlsProps {
  /** Whether cube is currently busy (animating moves or has queued moves) */
  isAnimating: boolean;
  /** Whether animations can be stopped (true when actively animating or has queued moves) */
  canStopAnimation: boolean;
  /** Function to execute a single move */
  executeMove: (move: MoveNotation | CubieMoveNotation) => void;
  /** Function to execute a sequence of moves */
  executeMoves: (moves: (MoveNotation | CubieMoveNotation)[]) => void;
  /** Function to reset cube to solved state */
  resetCube: () => void;
  /** Function to stop current animations */
  stopAnimation: () => void;
  /** Function to run test sequence */
  testSequence: () => void;
  /** Function to solve white cross (3x3 only) */
  solveWhiteCross?: () => void;
  /** Current cube size */
  cubeSize: number;
  /** Callback when cube size changes */
  onCubeSizeChange: (size: number) => void;
}

// Standard move notations for face rotations
const baseFaces = ["R", "L", "U", "D", "F", "B"];

/**
 * Generates appropriate moves for the given cube size
 * Avoids redundant moves like 3R and 2L' on a 4x4x4 cube
 */
const generateMovesForCubeSize = (cubeSize: number): CubieMoveNotation[] => {
  const moves: CubieMoveNotation[] = [];
  
  // Always include outer face moves
  baseFaces.forEach(face => {
    moves.push(face, `${face}'`);
  });
  
  // For cubes larger than 3x3x3, add inner layer moves
  if (cubeSize > 3) {
    // Calculate maximum inner layer to avoid redundant moves
    // For 4x4x4: 4 - floor(4/2) = 2 → layer 2
    // For 5x5x5: 5 - floor(5/2) = 3 → layers 2,3  
    // For 6x6x6: 6 - floor(6/2) = 3 → layers 2,3
    // For 7x7x7: 7 - floor(7/2) = 4 → layers 2,3,4
    const maxInnerLayer = cubeSize - Math.floor(cubeSize / 2);
    
    for (let layer = 2; layer <= maxInnerLayer; layer++) {
      // Add inner layer moves for all faces
      // All these moves are valid and distinct for each layer
      baseFaces.forEach(face => {
        moves.push(`${layer}${face}`, `${layer}${face}'`);
      });
    }
  }
  
  return moves;
};

/**
 * Extracts the face letter from a move notation
 * @param move - Move notation like "R", "2R'", "3U2"
 * @returns The face letter (R, L, U, D, F, B)
 */
function getMoveFace(move: MoveNotation): string {
  // Remove layer numbers and modifiers to get the base face
  return move.replace(/^[0-9]*/, '').replace(/['^2]$/, '').charAt(0);
}

/**
 * Checks if two moves cancel each other out
 * @param move1 - First move
 * @param move2 - Second move
 * @returns True if the moves cancel each other
 */
function movesCancel(move1: MoveNotation, move2: MoveNotation): boolean {
  const face1 = getMoveFace(move1);
  const face2 = getMoveFace(move2);
  
  // Different faces can't cancel
  if (face1 !== face2) {
    return false;
  }
  
  // Extract layer numbers
  const layer1 = move1.match(/^([0-9]*)/)?.[1] || '1';
  const layer2 = move2.match(/^([0-9]*)/)?.[1] || '1';
  
  // Different layers can't cancel
  if (layer1 !== layer2) {
    return false;
  }
  
  // Extract modifiers
  const modifier1 = move1.replace(/^[0-9]*[A-Z]/, '');
  const modifier2 = move2.replace(/^[0-9]*[A-Z]/, '');
  
  // Check for canceling combinations
  if ((modifier1 === '' && modifier2 === "'") || 
      (modifier1 === "'" && modifier2 === '') ||
      (modifier1 === '2' && modifier2 === '2')) {
    return true;
  }
  
  return false;
}

/**
 * Generates a random scramble sequence for the cube
 *
 * Creates a sequence of random valid moves while avoiding
 * consecutive moves on the same face to ensure good mixing.
 * Includes inner layer moves for larger cubes.
 *
 * @param length - Number of moves in the scramble (default: 20)
 * @param cubeSize - Size of the cube (3 for 3x3x3, 4 for 4x4x4, etc.) (default: 3)
 * @returns Array of move notations representing the scramble
 */
function generateScramble(
  length: number = 20,
  cubeSize: number = 3,
): MoveNotation[] {
  const faces = ["R", "L", "U", "D", "F", "B"];
  const modifiers = ["", "'", "2"];
  const moves: MoveNotation[] = [];

  // Generate moves for all possible layers
  faces.forEach((face) => {
    modifiers.forEach((modifier) => {
      // Outer face layer (e.g., R, R', R2)
      moves.push(`${face}${modifier}`);

      // Inner layer moves for cubes larger than 3x3x3
      if (cubeSize > 3) {
        // For cubes larger than 3x3x3, generate inner layer moves
        // Layer 2 to (cubeSize - 1) are the inner layers
        for (let layer = 2; layer < cubeSize; layer++) {
          moves.push(`${layer}${face}${modifier}`);
        }
      }
    });
  });

  const scramble: MoveNotation[] = [];

  for (let i = 0; i < length; i++) {
    let move: MoveNotation;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    do {
      // Select a random move from available moves
      move = moves[Math.floor(Math.random() * moves.length)];
      attempts++;
    } while (
      attempts < maxAttempts &&
      scramble.length > 0 &&
      // Avoid consecutive moves on the same face/axis for better scrambling
      (getMoveFace(move) === getMoveFace(scramble[scramble.length - 1]) ||
        // Avoid moves that cancel out the previous move
        movesCancel(move, scramble[scramble.length - 1]))
    );
    scramble.push(move);
  }

  return scramble;
}

/**
 * Control panel component for interacting with the Rubik's cube
 *
 * Provides buttons for:
 * - Individual face moves
 * - Custom move sequences
 * - Scrambling
 * - Cube reset
 * - Animation control
 * - Cube size adjustment
 *
 * @param props - Component props containing animation state and control functions
 * @returns JSX element with cube control interface
 */
export default function CubeControls({
  isAnimating,
  canStopAnimation,
  executeMove,
  executeMoves,
  resetCube,
  stopAnimation,
  testSequence,
  solveWhiteCross,
  cubeSize,
  onCubeSizeChange,
}: CubeControlsProps) {
  // State for user input controls
  const [customSeq, setCustomSeq] = useState<string>("");
  const [scrambleLen, setScrambleLen] = useState<number>(20);
  const [inputCubeSize, setInputCubeSize] = useState<string>(
    cubeSize.toString(),
  );

  /**
   * Executes a custom move sequence entered by the user
   */
  const handleCustomExecute = () => {
    // Parse space-separated move sequence
    const seq = customSeq.trim().split(/\s+/) as MoveNotation[];
    console.log("Executing custom sequence:", seq);
    if (seq.length > 0) {
      executeMoves(seq);
    }
  };

  /**
   * Generates and executes a random scramble sequence
   */
  const handleScramble = () => {
    const scramble = generateScramble(scrambleLen, cubeSize);
    executeMoves(scramble);
  };

  /**
   * Updates the cube size based on user input
   */
  const handleSetCubeSize = () => {
    const size = parseInt(inputCubeSize);
    if (!isNaN(size) && size >= 2) {
      onCubeSizeChange(size);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSetCubeSize();
    }
  };

  // Update input when cubeSize prop changes (e.g., from external reset)
  useEffect(() => {
    setInputCubeSize(cubeSize.toString());
  }, [cubeSize]);

  // Generate moves based on current cube size
  const moves = generateMovesForCubeSize(cubeSize);

  return (
    <div className="w-80 p-4 bg-card rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Cube Controls</h3>
      <div className="mb-4 p-2 bg-muted rounded-lg">
        <label className="block text-sm text-muted-foreground mb-1">
          Cube Size (≥2)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="2"
            value={inputCubeSize}
            onChange={(e) => setInputCubeSize(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAnimating}
            className="flex-1 px-2 py-1 border rounded bg-background"
            placeholder="Enter size"
          />
          <button
            onClick={handleSetCubeSize}
            disabled={
              isAnimating ||
              parseInt(inputCubeSize) < 2 ||
              isNaN(parseInt(inputCubeSize))
            }
            className="px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            Set
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Current: {cubeSize}×{cubeSize}×{cubeSize}
        </div>
      </div>
      <div className={`grid gap-2 mb-4 ${
        moves.length > 18 ? 'grid-cols-8' : 
        moves.length > 12 ? 'grid-cols-6' : 
        'grid-cols-4'
      }`}>
        {moves.map((m) => (
          <button
            key={m}
            onClick={() => executeMove(m)}
            disabled={isAnimating}
            className="w-full py-2 bg-primary text-primary-foreground rounded disabled:opacity-50 text-xs"
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">
          Custom Moves (separate each move with a space)
        </label>
        <input
          type="text"
          value={customSeq}
          onChange={(e) => setCustomSeq(e.target.value)}
          disabled={isAnimating}
          className="w-full px-2 py-1 border rounded mb-2"
          placeholder="Enter sequence"
        />
        <button
          onClick={handleCustomExecute}
          disabled={isAnimating}
          className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
        >
          Execute Sequence
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Scramble Length</label>
        <input
          type="number"
          min={1}
          value={scrambleLen}
          onChange={(e) => setScrambleLen(Number(e.target.value))}
          disabled={isAnimating}
          className="w-full px-2 py-1 border rounded mb-2"
        />
        <button
          onClick={handleScramble}
          disabled={isAnimating}
          className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded disabled:opacity-50"
        >
          Scramble
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={testSequence}
          disabled={isAnimating}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Test R U R' U'
        </button>
        {solveWhiteCross && cubeSize === 3 && (
          <button
            onClick={solveWhiteCross}
            disabled={isAnimating}
            className="w-full px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            Solve White Cross
          </button>
        )}
        <button
          onClick={resetCube}
          disabled={isAnimating}
          className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={stopAnimation}
          disabled={!canStopAnimation}
          className="w-full px-4 py-2 bg-muted text-muted-foreground rounded disabled:opacity-50"
        >
          Stop Animation
        </button>
      </div>
    </div>
  );
}
