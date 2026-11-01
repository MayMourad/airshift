import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { buildSyntheticDataset, type Dataset } from './lib/data'
import { DEFAULT_ROOM, type BudgetTier, type RoomProfile, type VentilationLevel } from './lib/model'

interface AppState {
  dataset: Dataset
  setDataset: (d: Dataset) => void
  resetDataset: () => void
  selectedRoom: string
  setSelectedRoom: (r: string) => void
  room: RoomProfile
  setRoom: (r: RoomProfile) => void
  budget: BudgetTier
  setBudget: (b: BudgetTier) => void
  roomsEquipped: 1 | 2
  setRoomsEquipped: (n: 1 | 2) => void
  ventilation: VentilationLevel
  setVentilation: (v: VentilationLevel) => void
  interventionAt: number | null
  setInterventionAt: (t: number | null) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const demo = useMemo(() => buildSyntheticDataset(), [])
  const [dataset, setDatasetRaw] = useState<Dataset>(demo)
  const [selectedRoom, setSelectedRoom] = useState('A')
  const [room, setRoom] = useState<RoomProfile>(DEFAULT_ROOM)
  const [budget, setBudget] = useState<BudgetTier>(1500)
  const [roomsEquipped, setRoomsEquipped] = useState<1 | 2>(1)
  const [ventilation, setVentilation] = useState<VentilationLevel>('moderate')
  const [interventionAt, setInterventionAt] = useState<number | null>(demo.interventionAt)

  const value = useMemo<AppState>(
    () => ({
      dataset,
      setDataset: (d) => {
        setDatasetRaw(d)
        setSelectedRoom(d.rooms[0]?.id ?? '')
        setInterventionAt(d.interventionAt)
      },
      resetDataset: () => {
        setDatasetRaw(demo)
        setSelectedRoom('A')
        setInterventionAt(demo.interventionAt)
      },
      selectedRoom,
      setSelectedRoom,
      room,
      setRoom,
      budget,
      setBudget,
      roomsEquipped,
      setRoomsEquipped,
      ventilation,
      setVentilation,
      interventionAt,
      setInterventionAt,
    }),
    [dataset, demo, selectedRoom, room, budget, roomsEquipped, ventilation, interventionAt],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppProvider')
  return v
}
