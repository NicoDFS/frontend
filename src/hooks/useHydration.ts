import { useState, useEffect } from 'react'

/**
 * Custom hook to handle hydration safely
 * Prevents hydration mismatches by ensuring components only render after client-side mount
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}
