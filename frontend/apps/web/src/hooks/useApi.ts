import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => Promise<void>
  setData: (data: T) => void
}

export function useApi<T>(fetcher: () => Promise<T>): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const data = await fetcherRef.current()
      setState({ data, loading: false, error: null })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }, [])

  useEffect(() => {
    execute()
  }, [execute])

  return {
    ...state,
    refetch: execute,
    setData: (data: T) => setState((prev) => ({ ...prev, data })),
  }
}
