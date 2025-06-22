import { useState, useCallback, useRef, useEffect } from 'react'
import { CubeState, MoveNotation, AnimationState } from '@/types/cube-pieces'
import { parseMove, applyMove, applyMoves } from '@/lib/cube-piece-moves'

interface UseCubePieceAnimationProps {
  initialState: CubeState
  animationDuration?: number
  onMoveComplete?: (move: MoveNotation) => void
  onSequenceComplete?: () => void
}

export function useCubePieceAnimation({
  initialState,
  animationDuration = 500,
  onMoveComplete,
  onSequenceComplete
}: UseCubePieceAnimationProps) {
  const [cubeState, setCubeState] = useState<CubeState>(initialState)
  const [cubeVersion, setCubeVersion] = useState<number>(0) // Add version counter for forced recreation
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    currentMove: null,
    currentAngle: 0,
    targetAngle: 0,
    progress: 0
  })
  
  const moveQueueRef = useRef<MoveNotation[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)

  const animateMove = useCallback((move: MoveNotation) => {
    if (animationState.isAnimating) return false
    
    const parsedMove = parseMove(move)
    
    setAnimationState({
      isAnimating: true,
      currentMove: parsedMove,
      currentAngle: 0,
      targetAngle: parsedMove.angle,
      progress: 0
    })
    
    startTimeRef.current = performance.now()
    
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return
      
      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / animationDuration, 1)
      
      // Smooth easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentAngle = parsedMove.angle * easeProgress
      
      setAnimationState(prev => ({
        ...prev,
        currentAngle,
        progress: easeProgress
      }))
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete - apply the move to the state
        setCubeState(prevState => applyMove(prevState, parsedMove))
        
        // Force cube recreation by incrementing version
        setCubeVersion(prev => prev + 1)
        
        setAnimationState({
          isAnimating: false,
          currentMove: null,
          currentAngle: 0,
          targetAngle: 0,
          progress: 0
        })
        
        onMoveComplete?.(move)
        
        // Process next move in queue
        if (moveQueueRef.current.length > 0) {
          const nextMove = moveQueueRef.current.shift()!
          setTimeout(() => animateMove(nextMove), 50) // Small delay between moves
        } else {
          onSequenceComplete?.()
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    return true
  }, [animationState.isAnimating, animationDuration, onMoveComplete, onSequenceComplete])

  const executeMove = useCallback((moveNotation: MoveNotation) => {
    // Handle double-turn notation (e.g. 'R2', '2R2', including layer prefixes)
    const doubleRegex = /^(\d*)([RLUDFB])2('?)/i
    const match = doubleRegex.exec(moveNotation)
    if (match) {
      const [, layer, face, prime] = match
      // Quarter-turn notation
      const quarter = `${layer}${face}${prime || ''}`
      // If not currently animating, reset any pending moves
      if (!animationState.isAnimating) {
        moveQueueRef.current = []
      }
      // Enqueue exactly two quarter-turns
      moveQueueRef.current.push(quarter, quarter)
      // If starting fresh, kick off the first quarter move
      if (!animationState.isAnimating) {
        const next = moveQueueRef.current.shift()!
        animateMove(next)
      }
      return
    }
    if (animationState.isAnimating) {
      moveQueueRef.current.push(moveNotation)
    } else {
      animateMove(moveNotation)
    }
  }, [animateMove, animationState.isAnimating])

  const executeMoves = useCallback((moves: MoveNotation[]) => {
    if (moves.length === 0) return
    
    const [firstMove, ...remainingMoves] = moves
    moveQueueRef.current.push(...remainingMoves)
    executeMove(firstMove)
  }, [executeMove])

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
    
    moveQueueRef.current = []
    setAnimationState({
      isAnimating: false,
      currentMove: null,
      currentAngle: 0,
      targetAngle: 0,
      progress: 0
    })
  }, [])

  const resetCube = useCallback(() => {
    stopAnimation()
    setCubeState(initialState)
    setCubeVersion(0) // Reset version on cube reset
  }, [initialState, stopAnimation])

  const applyCubeMoves = useCallback((moves: MoveNotation[]) => {
    stopAnimation()
    setCubeState(prevState => applyMoves(prevState, moves))
    setCubeVersion(prev => prev + 1) // Increment version after applying moves
  }, [stopAnimation])

  const setCubeToState = useCallback((newState: CubeState) => {
    stopAnimation()
    setCubeState(newState)
    setCubeVersion(prev => prev + 1) // Increment version to force recreation
  }, [stopAnimation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    cubeState,
    setCubeState,
    setCubeToState,
    cubeVersion, // Export the version for forced recreation
    animationState,
    executeMove,
    executeMoves,
    stopAnimation,
    resetCube,
    applyCubeMoves,
    isAnimating: animationState.isAnimating
  }
}
