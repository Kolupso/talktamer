import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Debate } from '../types/db'
import { supabase } from '../lib/supabaseClient'
import {
  createDebate as createDebateApi,
  listDebates,
  switchActiveDebate,
  updateDebate,
} from '../data/debates'

type ActiveDebateContextValue = {
  debates: Debate[]
  activeDebate: Debate | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createDebate: (name: string) => Promise<void>
  switchDebate: (id: number) => Promise<void>
  updateSettings: (patch: Partial<Debate>) => Promise<void>
}

const ActiveDebateContext = createContext<ActiveDebateContextValue | undefined>(
  undefined,
)

export function ActiveDebateProvider({ children }: { children: ReactNode }) {
  const [debates, setDebates] = useState<Debate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setDebates(await listDebates())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    // Keep in sync with changes from any window (create/switch/settings).
    const channel = supabase
      .channel('debates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debates' },
        () => refresh(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const activeDebate = debates.find((d) => d.is_active) ?? null

  const createDebate = useCallback(
    async (name: string) => {
      const created = await createDebateApi(name)
      await switchActiveDebate(created.id) // a freshly created debate becomes active
      await refresh()
    },
    [refresh],
  )

  const switchDebate = useCallback(
    async (id: number) => {
      await switchActiveDebate(id)
      await refresh()
    },
    [refresh],
  )

  const updateSettings = useCallback(
    async (patch: Partial<Debate>) => {
      if (!activeDebate) return
      // Optimistic local update so the UI feels instant.
      setDebates((prev) =>
        prev.map((d) => (d.id === activeDebate.id ? { ...d, ...patch } : d)),
      )
      await updateDebate(activeDebate.id, patch)
    },
    [activeDebate],
  )

  const value: ActiveDebateContextValue = {
    debates,
    activeDebate,
    loading,
    error,
    refresh,
    createDebate,
    switchDebate,
    updateSettings,
  }

  return (
    <ActiveDebateContext.Provider value={value}>
      {children}
    </ActiveDebateContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveDebate() {
  const ctx = useContext(ActiveDebateContext)
  if (!ctx)
    throw new Error('useActiveDebate must be used within an ActiveDebateProvider')
  return ctx
}
