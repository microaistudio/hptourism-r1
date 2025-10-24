import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface NavigationHeaderProps {
  title?: string;
  showHome?: boolean;
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

export function NavigationHeader({ 
  title, 
  showHome = true, 
  showBack = true, 
  backTo,
  actions 
}: NavigationHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backTo) {
      setLocation(backTo);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <h1 className="text-xl font-semibold ml-2" data-testid="text-page-title">
                {title}
              </h1>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
