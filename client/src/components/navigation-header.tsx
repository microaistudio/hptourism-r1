import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import himachalTourismLogo from "@assets/WhatsApp Image 2025-10-25 at 07.59.16_5c0e8739_1761362811579.jpg";
import hpGovtLogo from "@assets/WhatsApp Image 2025-10-25 at 08.03.16_1cdc4198_1761362811579.jpg";

interface NavigationHeaderProps {
  title?: string;
  subtitle?: string;
  showHome?: boolean;
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

export function NavigationHeader({ 
  title, 
  subtitle,
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
          <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-3">
                <img 
                  src={himachalTourismLogo} 
                  alt="Himachal Tourism" 
                  className="h-12 w-auto object-contain"
                  data-testid="img-hp-tourism-logo"
                />
                <div className="border-l h-12 border-border"></div>
                <div>
                  <h1 className="text-lg font-semibold leading-tight" data-testid="text-page-title">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground leading-tight" data-testid="text-page-subtitle">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              <img 
                src={hpGovtLogo} 
                alt="Himachal Government" 
                className="h-10 w-auto object-contain"
                data-testid="img-hp-govt-logo"
              />
              <div className="border-l h-10 border-border"></div>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
