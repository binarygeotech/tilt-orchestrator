import { Moon, Sun } from "lucide-react"

import { useTheme } from "./ThemeProvider"
import { Button } from "./ui/button"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="border-border bg-background hover:bg-accent fixed top-4 right-4 z-50 h-9 w-9 rounded-md border"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  )
}
