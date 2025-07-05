import {
  Cubie,
  CubieMoveNotation,
  CubieState,
} from "../types/cubie";
import {
  copyCubieState,
  executeSolverMove,
  getCubieDisplayColor,
} from "./cubie-utils";

/**
 * Represents a white edge piece and its current state
 */
interface WhiteEdge {
  /** The cubie representing this edge */
  cubie: Cubie;
  /** Whether this edge is correctly positioned and oriented */
  isSolved: boolean;
}

/**
 * Maps edge colors to their target positions on the white face (top layer, y=2)
 */
/**
 * Represents a node in the BFS search graph
 */
interface GraphNode {
  stateHash: string;
  moves: CubieMoveNotation[];
  depth: number;
}

/**
 * White Cross Solver for 3x3 Rubik's Cube
 * Implements a proper graph-based BFS algorithm
 * Nodes = cube states (hashed by white edge positions/orientations)
 * Edges = moves that transition between states
 * Target = solved white cross state
 */
export class WhiteCrossSolver {
  private initialState: CubieState;
  private visitedStates = new Map<string, CubieMoveNotation[]>(); // stateHash -> moves to reach this state
  private fundamentalMoves: CubieMoveNotation[] = [
    'R', "R'", 'U', "U'", 'L', "L'", 'F', "F'", 'B', "B'", 'D', "D'"
  ];
  private targetStateHash: string;

  constructor(initialState: CubieState) {
    if (initialState.size !== 3) {
      throw new Error("White cross solver only supports 3x3 cubes");
    }
    this.initialState = copyCubieState(initialState);
    
    // Create the target state hash (solved white cross)
    this.targetStateHash = this.createSolvedWhiteCrossHash();
  }

  /**
   * Creates a hash representing the solved white cross state
   */
  private createSolvedWhiteCrossHash(): string {
    // For a solved white cross, all white edges should be in their original positions
    return "SOLVED";
  }

  /**
   * Solves the white cross using optimized graph-based BFS
   */
  solve(): CubieMoveNotation[] {
    const startState = copyCubieState(this.initialState);
    const startHash = this.hashWhiteCrossState(startState);
    
    // Check if already solved
    if (startHash === this.targetStateHash) {
      return [];
    }

    // BFS queue: each node represents a cube state
    const queue: GraphNode[] = [{
      stateHash: startHash,
      moves: [],
      depth: 0
    }];
    
    // Track visited states and the moves to reach them
    this.visitedStates.set(startHash, []);
    
    const maxDepth = 12; // Increased to handle 8-move solutions
    let nodesExplored = 0;
    const maxNodes = 50000; // Increased node limit
    
    while (queue.length > 0 && nodesExplored < maxNodes) {
      const currentNode = queue.shift()!;
      nodesExplored++;
      
      // Skip if we've gone too deep
      if (currentNode.depth >= maxDepth) {
        continue;
      }
      
      // Get valid moves (avoiding inverse of last move and redundant sequences)
      const validMoves = this.getValidMoves(currentNode.moves);
      
      // Prioritize moves that might help with white cross (bottom and top face moves first)
      const prioritizedMoves = this.prioritizeMovesForWhiteCross(validMoves);
      
      for (const move of prioritizedMoves) {
        // Apply move to get new state
        const currentState = this.stateFromHash(currentNode.stateHash, startState, currentNode.moves);
        const newState = executeSolverMove(currentState, move);
        const newHash = this.hashWhiteCrossState(newState);
        
        // Skip if we've seen this state before (loop prevention)
        if (this.visitedStates.has(newHash)) {
          continue;
        }
        
        const newMoves = [...currentNode.moves, move];
        
        // Check if this is the target state (solved white cross)
        if (newHash === this.targetStateHash) {
          return newMoves;
        }
        
        // Add to visited states and queue for further exploration
        this.visitedStates.set(newHash, newMoves);
        queue.push({
          stateHash: newHash,
          moves: newMoves,
          depth: currentNode.depth + 1
        });
      }
    }
    
    // Try a fallback approach with a different strategy
    return this.fallbackSolve();
  }

  /**
   * Gets valid moves, excluding inverses of the last move and redundant sequences
   */
  private getValidMoves(previousMoves: CubieMoveNotation[]): CubieMoveNotation[] {
    if (previousMoves.length === 0) {
      return [...this.fundamentalMoves];
    }
    
    const lastMove = previousMoves[previousMoves.length - 1];
    const lastFace = lastMove.charAt(0);
    
    // Filter out moves that would be redundant or counterproductive
    return this.fundamentalMoves.filter(move => {
      const currentFace = move.charAt(0);
      
      // Don't do the inverse of the last move (immediate backtracking)
      if (move === this.getInverseMove(lastMove)) {
        return false;
      }
      
      // Don't do the same face move consecutively more than 3 times
      if (currentFace === lastFace && previousMoves.length >= 2) {
        const secondLastMove = previousMoves[previousMoves.length - 2];
        const secondLastFace = secondLastMove.charAt(0);
        if (secondLastFace === lastFace) {
          return false; // Already did this face twice in a row
        }
      }
      
      return true;
    });
  }

  /**
   * Gets the inverse of a move (e.g., R -> R', R' -> R)
   */
  private getInverseMove(move: CubieMoveNotation): CubieMoveNotation {
    const inverseMoves: Record<CubieMoveNotation, CubieMoveNotation> = {
      'R': "R'",
      "R'": 'R',
      'U': "U'",
      "U'": 'U',
      'L': "L'",
      "L'": 'L',
      'F': "F'",
      "F'": 'F',
      'B': "B'",
      "B'": 'B',
      'D': "D'",
      "D'": 'D'
    };
    
    return inverseMoves[move];
  }

  /**
   * Prioritizes moves that are more likely to help solve the white cross
   */
  private prioritizeMovesForWhiteCross(moves: CubieMoveNotation[]): CubieMoveNotation[] {
    // Prioritize bottom face moves (D, D') and top face moves (U, U') as they're most relevant for white cross
    const priority1 = moves.filter(move => move.startsWith('D') || move.startsWith('U'));
    const priority2 = moves.filter(move => move.startsWith('F') || move.startsWith('B'));
    const priority3 = moves.filter(move => move.startsWith('R') || move.startsWith('L'));
    
    return [...priority1, ...priority2, ...priority3];
  }

  /**
   * Fallback solver using a simpler approach if BFS fails
   */
  private fallbackSolve(): CubieMoveNotation[] {
    // Try common white cross algorithms with limited moves
    const commonSequences: CubieMoveNotation[][] = [
      ['F', 'D', "R'", "D'"],
      ['R', 'D', "B'", "D'"],
      ['B', 'D', "L'", "D'"],
      ['L', 'D', "F'", "D'"],
      ['U', 'R', 'U', "R'"],
      ['U', 'F', 'U', "F'"],
      ['U', 'L', 'U', "L'"],
      ['U', 'B', 'U', "B'"]
    ];
    
    let currentState = copyCubieState(this.initialState);
    const allMoves: CubieMoveNotation[] = [];
    
    for (const sequence of commonSequences) {
      for (const move of sequence) {
        currentState = executeSolverMove(currentState, move);
        allMoves.push(move);
        
        const currentHash = this.hashWhiteCrossState(currentState);
        if (currentHash === this.targetStateHash) {
          return allMoves;
        }
      }
    }
    
    return [];
  }

  /**
   * Reconstructs a cube state from a hash and move sequence
   */
  private stateFromHash(_hash: string, startState: CubieState, moves: CubieMoveNotation[]): CubieState {
    let state = copyCubieState(startState);
    for (const move of moves) {
      state = executeSolverMove(state, move);
    }
    return state;
  }

  /**
   * Creates a hash that identifies if the white cross is solved
   * Returns "SOLVED" if all white edges are correctly positioned and oriented
   */
  private hashWhiteCrossState(state: CubieState): string {
    const whiteEdges = this.findWhiteEdges(state);
    
    // Check if we have exactly 4 white edges
    if (whiteEdges.length !== 4) {
      return `INCOMPLETE:${whiteEdges.length}`;
    }
    
    // Check if all white edges are solved (position AND orientation)
    const allSolved = whiteEdges.every(edge => {
      const [currentX, currentY, currentZ] = edge.cubie.renderPosition;
      const [originalX, originalY, originalZ] = edge.cubie.originalRenderPosition;
      const positionCorrect = currentX === originalX && currentY === originalY && currentZ === originalZ;
      const orientationCorrect = positionCorrect && getCubieDisplayColor(edge.cubie, 'top', 3) === 'white';
      return positionCorrect && orientationCorrect;
    });
    
    if (allSolved) {
      return "SOLVED";
    }
    
    // Create a hash based on current positions AND orientations, sorted by original position for consistency
    const edgeStates = whiteEdges.map(edge => {
      const [currentX, currentY, currentZ] = edge.cubie.renderPosition;
      const [originalX, originalY, originalZ] = edge.cubie.originalRenderPosition;
      const whiteOnTop = getCubieDisplayColor(edge.cubie, 'top', 3) === 'white';
      
      return {
        originalPos: `${originalX},${originalY},${originalZ}`,
        currentPos: `${currentX},${currentY},${currentZ}`,
        orientation: whiteOnTop ? 'W' : 'X', // W = white on top, X = other color on top
        isSolved: currentX === originalX && currentY === originalY && currentZ === originalZ && whiteOnTop
      };
    });
    
    // Sort by original position for consistent hashing
    edgeStates.sort((a, b) => a.originalPos.localeCompare(b.originalPos));
    
    const hash = edgeStates.map(state => `${state.currentPos}:${state.orientation}`).join('|');
    
    return hash;
  }

  /**
   * Finds all white edge pieces in the cube
   */
  private findWhiteEdges(state: CubieState): WhiteEdge[] {
    const whiteEdges: WhiteEdge[] = [];
    
    // Simply filter all cubies for edges that have white in their colors
    const allEdges = state.cubies.filter(cubie => cubie.type === 'edge');
    
    for (const cubie of allEdges) {
      // Check if this edge has a white sticker
      const hasWhite = this.hasWhiteSticker(cubie);
      if (hasWhite) {
        // Calculate if solved properly here - both position AND orientation
        const [currentX, currentY, currentZ] = cubie.renderPosition;
        const [originalX, originalY, originalZ] = cubie.originalRenderPosition;
        const positionCorrect = currentX === originalX && currentY === originalY && currentZ === originalZ;
        
        // Check orientation: white should be facing up (top face) when in original position
        const orientationCorrect = positionCorrect && getCubieDisplayColor(cubie, 'top', 3) === 'white';
        const isSolved = positionCorrect && orientationCorrect;
        
        whiteEdges.push({
          cubie,
          isSolved
        });
      }
    }

    return whiteEdges;
  }

  /**
   * Checks if a cubie has a white sticker
   */
  private hasWhiteSticker(cubie: Cubie): boolean {
    return Object.values(cubie.colors).includes('white');
  }

  /**
   * Validates that the white cross is solved
   */
  validateSolution(finalState: CubieState): boolean {
    const whiteEdges = this.findWhiteEdges(finalState);
    return whiteEdges.every(edge => edge.isSolved);
  }

}
