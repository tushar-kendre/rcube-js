import { applyMove, applyMoves, parseMove } from '@/lib/cube-piece-moves'
import { AnimationState, CubeState, MoveNotation } from '@/types/cube-pieces'
import { useCallback, useEffect, useRef, useState } from 'react'

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
          animateMove(nextMove) // Immediately start next move for smooth animation
        } else {
          onSequenceComplete?.()
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    return true
  }, [animationState.isAnimating, animationDuration, onMoveComplete, onSequenceComplete])

  const executeMove = useCallback((moveNotation: MoveNotation) => {
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

  // Update cube state when initialState changes (e.g., cube size change)
  useEffect(() => {
    setCubeState(initialState)
    setCubeVersion(prev => prev + 1) // Increment version to force recreation
  }, [initialState])

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
