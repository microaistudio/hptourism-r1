import { useTheme, ThemeName } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";

const THEMES = [
  { id: "classic-clean", name: "Classic Clean", description: "Default - No hero image" },
  { id: "classic", name: "Classic Portal", description: "Pine green with hero" },
  { id: "professional-blue", name: "Professional Blue", description: "Traditional government style" },
  { id: "mountain-sky", name: "Mountain Sky", description: "Sky blue & mountains" },
  { id: "heritage-gold", name: "Heritage Gold", description: "Warm cultural tones" },
  { id: "forest-green", name: "Forest Green", description: "Deep emerald green" },
  { id: "vibrant", name: "Vibrant HP", description: "Colorful & energetic" },
  { id: "official-dual-logo", name: "Official Dual Logo", description: "With official HP Tourism logos" },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-theme-switcher">
          <Palette className="w-4 h-4 mr-2" />
          Theme
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id as ThemeName)}
            className="flex items-start gap-2 cursor-pointer"
            data-testid={`theme-option-${t.id}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                {theme === t.id && <Check className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
