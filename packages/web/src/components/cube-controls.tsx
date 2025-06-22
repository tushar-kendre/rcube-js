import { generateScramble } from '@/lib/cube-piece-moves'
import { MoveNotation } from '@/types/cube-pieces'
import { useEffect, useState } from 'react'

interface CubeControlsProps {
  isAnimating: boolean
  executeMove: (move: MoveNotation) => void
  executeMoves: (moves: MoveNotation[]) => void
  resetCube: () => void
  stopAnimation: () => void
  testSequence: () => void
  cubeSize: number
  onCubeSizeChange: (size: number) => void
}

const moves: MoveNotation[] = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'B', "B'"]

export default function CubeControls({
  isAnimating,
  executeMove,
  executeMoves,
  resetCube,
  stopAnimation,
  testSequence,
  cubeSize,
  onCubeSizeChange
}: CubeControlsProps) {
  const [customSeq, setCustomSeq] = useState<string>('')
  const [scrambleLen, setScrambleLen] = useState<number>(20)
  const [inputCubeSize, setInputCubeSize] = useState<string>(cubeSize.toString())

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

  const handleSetCubeSize = () => {
    const size = parseInt(inputCubeSize)
    if (!isNaN(size) && size >= 2) {
      onCubeSizeChange(size)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSetCubeSize()
    }
  }

  // Update input when cubeSize prop changes (e.g., from external reset)
  useEffect(() => {
    setInputCubeSize(cubeSize.toString())
  }, [cubeSize])

  return (
    <div className="w-80 p-4 bg-card rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Cube Controls</h3>
      <div className="mb-4 p-2 bg-muted rounded-lg">
        <label className="block text-sm text-muted-foreground mb-1">Cube Size (≥2)</label>
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
            disabled={isAnimating || parseInt(inputCubeSize) < 2 || isNaN(parseInt(inputCubeSize))}
            className="px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            Set
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Current: {cubeSize}×{cubeSize}×{cubeSize}
        </div>
      </div>
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
