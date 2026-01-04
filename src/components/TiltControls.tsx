import React, { useEffect, useState } from "react"

import { Project } from "@/types/project"

import { getTiltState, startTilt, stopTilt } from "../api/api"

interface Props {
  project: Project
  env: string
}

const TiltControls: React.FC<Props> = ({ project, env }) => {
  const [status, setStatus] = useState("stopped")

  useEffect(() => {
    const interval = setInterval(async () => {
      const state = await getTiltState(project, env)
      const parsed = typeof state === "string" ? JSON.parse(state) : state
      setStatus(parsed.tilt.status)
    }, 2000)
    return () => clearInterval(interval)
  }, [project, env])

  return (
    <div>
      <button
        onClick={() => startTilt(project, env)}
        disabled={status === "running"}
      >
        Start Tilt
      </button>
      <button
        onClick={() => stopTilt(project, env)}
        disabled={status !== "running"}
      >
        Stop Tilt
      </button>
      <span style={{ marginLeft: 10 }}>Status: {status}</span>
    </div>
  )
}

export default TiltControls
