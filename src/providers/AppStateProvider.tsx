import React, { createContext, ReactNode, useContext, useState } from "react"

import { RecentProject } from "@/types/app"

interface IAppState {
  recent_projects: RecentProject[]
  preferences: Record<string, any>
  app_started?: boolean
}

interface AppStateContextType {
  state: IAppState
  setAppState: (state: IAppState) => void
}

const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined
)

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<IAppState>({
    recent_projects: [],
    preferences: {
      auto_open_last_project: false,
    },
    app_started: false,
  })

  return (
    <AppStateContext.Provider
      value={{
        state,
        setAppState: setState,
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider")
  }
  return context
}
