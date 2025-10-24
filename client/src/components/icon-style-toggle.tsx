import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { useState, useEffect } from "react";

export function IconStyleToggle() {
  const [iconStyle, setIconStyle] = useState<"clean" | "bold">("clean");

  useEffect(() => {
    const saved = localStorage.getItem("icon-style") as "clean" | "bold" | null;
    if (saved) {
      setIconStyle(saved);
      document.documentElement.setAttribute("data-icon-style", saved);
    }
  }, []);

  const toggleStyle = () => {
    const newStyle = iconStyle === "clean" ? "bold" : "clean";
    setIconStyle(newStyle);
    localStorage.setItem("icon-style", newStyle);
    document.documentElement.setAttribute("data-icon-style", newStyle);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleStyle}
      data-testid="button-icon-style"
      title={iconStyle === "clean" ? "Switch to Bold Icons" : "Switch to Clean Icons"}
    >
      <Palette className="w-4 h-4 mr-2" />
      {iconStyle === "clean" ? "Bold Icons" : "Clean Icons"}
    </Button>
  );
}
