import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Clean up after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

beforeAll(() => {
  console.log('🧪 Starting cube logic tests...')
})

afterAll(() => {
  console.log('✅ Cube logic tests completed!')
})

// Helper function to pretty print cube state (useful for debugging)
declare global {
  var printCube: (cube: any) => void
}

global.printCube = (cube: any) => {
  console.log('Cube state:')
  Object.entries(cube).forEach(([face, colors]) => {
    console.log(`${face}:`, colors)
  })
}