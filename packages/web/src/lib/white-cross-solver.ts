import {
  Cubie,
  CubieMoveNotation,
  CubieState,
} from "../types/cubie";
import { CubeColor, CubeFace } from "../types/cube-core";
import {
  copyCubieState,
  executeSolverMove,
  executeSolverMoveSequence,
  getCubieDisplayColor,
} from "./cubie-utils";

const COLOR_TO_FACE: Record<CubeColor, CubeFace> = {
  red: 'front',
  orange: 'back',
  green: 'left',
  blue: 'right',
  white: 'top',
  yellow: 'bottom',
};

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
 * White Cross Solver for 3x3 Rubik's Cube.
 * Uses a straightforward heuristic approach to insert each white edge
 * into its correct position without an exhaustive search.
 */
export class WhiteCrossSolver {
  private initialState: CubieState;
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
   * Solves the white cross using a simple heuristic approach.
   */
  solve(): CubieMoveNotation[] {
    let state = copyCubieState(this.initialState);
    const solution: CubieMoveNotation[] = [];

    let iterations = 0;
    while (this.hashWhiteCrossState(state) !== this.targetStateHash && iterations < 10) {
      const edges = this.findWhiteEdges(state);
      for (const edge of edges) {
        if (edge.isSolved) continue;
        state = this.solveEdge(edge.cubie, state, solution);
      }
      iterations++;
    }

    if (this.hashWhiteCrossState(state) === this.targetStateHash) {
      return solution;
    }

    // Fallback to the old simple sequences if our heuristics failed
    return this.fallbackSolve();
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

  /** Gets the face that currently contains the white sticker */
  private getWhiteStickerFace(cubie: Cubie): CubeFace | null {
    const faces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    for (const face of faces) {
      if (getCubieDisplayColor(cubie, face, 3) === 'white') {
        return face;
      }
    }
    return null;
  }

  /** Gets the non-white sticker face and color for an edge */
  private getOtherSticker(cubie: Cubie): { face: CubeFace; color: CubeColor } {
    const faces: CubeFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
    for (const face of faces) {
      const color = getCubieDisplayColor(cubie, face, 3);
      if (color && color !== 'white') {
        return { face, color };
      }
    }
    // Fallback - shouldn't happen
    return { face: 'front', color: 'red' };
  }

  private colorToFace(color: CubeColor): CubeFace {
    return COLOR_TO_FACE[color];
  }

  private getCubieById(state: CubieState, id: number): Cubie {
    const cubie = state.cubies.find(c => c.id === id);
    if (!cubie) {
      throw new Error('Cubie not found');
    }
    return cubie;
  }

  /** Inserts a single white edge using simple moves */
  private solveEdge(cubie: Cubie, state: CubieState, moves: CubieMoveNotation[]): CubieState {
    let workingCubie = this.getCubieById(state, cubie.id);
    let whiteFace = this.getWhiteStickerFace(workingCubie);
    let other = this.getOtherSticker(workingCubie);

    const moveMap: Record<CubeFace, string> = {
      front: 'F',
      back: 'B',
      left: 'L',
      right: 'R',
      top: 'U',
      bottom: 'D',
    };

    let guard = 0;
    while (whiteFace !== 'bottom' && guard < 6) {
      const m = moveMap[whiteFace!];
      const seq: CubieMoveNotation[] = [m, 'D', `${m}'`];
      state = executeSolverMoveSequence(state, seq);
      moves.push(...seq);
      workingCubie = this.getCubieById(state, cubie.id);
      whiteFace = this.getWhiteStickerFace(workingCubie);
      other = this.getOtherSticker(workingCubie);
      guard++;
    }

    if (whiteFace === 'bottom') {
      const targetFace = this.colorToFace(other.color);
      while (other.face !== targetFace && guard < 10) {
        state = executeSolverMove(state, 'D');
        moves.push('D');
        workingCubie = this.getCubieById(state, cubie.id);
        other = this.getOtherSticker(workingCubie);
        guard++;
      }

      const faceMove = moveMap[targetFace];
      const doubleMove = `${faceMove}2` as CubieMoveNotation;
      state = executeSolverMove(state, doubleMove);
      moves.push(doubleMove);
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
