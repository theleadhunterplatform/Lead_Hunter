'use client'

import { useSyncExternalStore } from 'react'

export interface CopilotSnapshot {
  open: boolean
  minimized: boolean
}

const CLOSED: CopilotSnapshot = { open: false, minimized: false }

let snapshot: CopilotSnapshot = CLOSED
const listeners = new Set<() => void>()

function commit(next: CopilotSnapshot) {
  if (next.open === snapshot.open && next.minimized === snapshot.minimized) return
  snapshot = next
  listeners.forEach((listener) => listener())
}

export const copilotStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => CLOSED,
  open() {
    commit({ open: true, minimized: false })
  },
  setOpen(open: boolean) {
    commit({ open, minimized: false })
  },
  minimize() {
    commit({ open: true, minimized: true })
  },
  expand() {
    commit({ open: true, minimized: false })
  },
  close() {
    commit(CLOSED)
  },
}

export function useCopilot(): CopilotSnapshot {
  return useSyncExternalStore(
    copilotStore.subscribe,
    copilotStore.getSnapshot,
    copilotStore.getServerSnapshot,
  )
}
