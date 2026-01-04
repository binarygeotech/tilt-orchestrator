import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
import { TiltState, updateTrayMenu } from "@/api/tray"

import { Project } from "@/types/project"

interface TrayIconState {
  current_project?: Project | null
  env?: string
  tilt_status?: TiltState | null
}

interface TrayIconContextType {
  state: TrayIconState
  setTrayIcon: (state: TrayIconState) => void
}

const TrayIconContext = createContext<TrayIconContextType | undefined>(
  undefined
)

export const TrayIconProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<TrayIconState>({
    current_project: null,
    env: "dev",
    tilt_status: null,
  })

  const triggerUpdateTray = async () => {
    await updateTrayMenu(
      state.current_project ?? null,
      state.env ?? "",
      state.tilt_status as TiltState
    )
  }

  useEffect(() => {
    triggerUpdateTray()
  }, [state])

  return (
    <TrayIconContext.Provider
      value={{
        state,
        setTrayIcon: setState,
      }}
    >
      {children}
    </TrayIconContext.Provider>
  )
}

export const useTrayIcon = (): TrayIconContextType => {
  const context = useContext(TrayIconContext)
  if (!context) {
    throw new Error("useTrayIcon must be used within an TrayIconProvider")
  }
  return context
}
