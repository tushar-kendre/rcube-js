import { useState } from 'react'
import { MoveNotation } from '@/types/cube-pieces'
import { generateScramble } from '@/lib/cube-piece-moves'

interface CubeControlsProps {
  isAnimating: boolean
  executeMove: (move: MoveNotation) => void
  executeMoves: (moves: MoveNotation[]) => void
  resetCube: () => void
  stopAnimation: () => void
  testSequence: () => void
}

const moves: MoveNotation[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"]

export default function CubeControls({
  isAnimating,
  executeMove,
  executeMoves,
  resetCube,
  stopAnimation,
  testSequence
}: CubeControlsProps) {
  const [customSeq, setCustomSeq] = useState<string>('')
  const [scrambleLen, setScrambleLen] = useState<number>(20)

  const handleCustomExecute = () => {
    const seq = customSeq.trim().split(/\s+/) as MoveNotation[]
    console.log('Executing custom sequence:', seq)
    if (seq.length > 0) {
      executeMoves(seq)
    }
  }

  const handleScramble = () => {
    const scramble = generateScramble(scrambleLen)
    executeMoves(scramble)
  }

  return (
    <div className="w-80 p-4 bg-card rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Cube Controls</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {moves.map(m => (
          <button
            key={m}
            onClick={() => executeMove(m)}
            disabled={isAnimating}
            className="w-full py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Custom Moves (separate each move with a space)</label>
        <input
          type="text"
          value={customSeq}
          onChange={e => setCustomSeq(e.target.value)}
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
          onChange={e => setScrambleLen(Number(e.target.value))}
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
        <button
          onClick={resetCube}
          disabled={isAnimating}
          className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={stopAnimation}
          disabled={!isAnimating}
          className="w-full px-4 py-2 bg-muted text-muted-foreground rounded disabled:opacity-50"
        >
          Stop Animation
        </button>
      </div>
    </div>
  )
}
