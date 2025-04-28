import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { getCurrentUser, logoutUser } from "@/lib/services/userService";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  User as UserIcon, 
  ClipboardList, 
  Home, 
  Settings, 
  Users, 
  Menu, 
  X, 
  Camera, 
  ImageIcon,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { User } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const isAdmin = user?.role === "admin";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Get the user on mount only
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (!currentUser) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      roles: ["user"]
    },
    {
      href: "/orders",
      label: "Orders",
      icon: <ClipboardList className="h-5 w-5" />,
      roles: ["user"]
    },
    {
      href: "/admin",
      label: "Admin",
      icon: <Settings className="h-5 w-5" />,
      roles: ["admin"]
    },
    {
      href: "/photographers",
      label: "Photographers",
      icon: <Users className="h-5 w-5" />,
      roles: ["admin"]
    }
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user.name) return "U";
    return user.name.split(" ")
      .map(name => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar - Enhanced */}
      <div className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-primary to-primary/90 shadow-lg fixed h-screen z-40 transition-all duration-300 ease-in-out overflow-hidden">
        {/* Logo section with icon */}
        <div className="py-6 px-4 flex items-center justify-center space-x-2 border-b border-primary-foreground/10">
          <Camera className="h-7 w-7 text-primary-foreground" />
          <h1 className="text-xl font-bold text-primary-foreground">Photofine Lab</h1>
        </div>

        <ScrollArea className="flex-1 pt-6">
          <div className="flex flex-col space-y-1 px-3">
            {filteredNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10 transition-all duration-200",
                  "rounded-lg h-11 px-4 mb-1 relative overflow-hidden",
                  location.pathname === item.href && 
                  "bg-white/15 text-primary-foreground font-medium shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-white"
                )}
                onClick={() => navigate(item.href)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
                {location.pathname === item.href && (
                  <ChevronRight className="ml-auto h-4 w-4 opacity-70" />
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Enhanced user profile section */}
        <div className="border-t border-primary-foreground/10 pt-4 mt-4 mx-3 pb-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Avatar className="h-10 w-10 mr-3 border-2 border-primary-foreground/20">
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-foreground truncate">{user.name}</p>
                <p className="text-xs text-primary-foreground/70 truncate">{user.email}</p>
              </div>
              {isAdmin && (
                <span className="ml-2 px-2 py-0.5 bg-accent/80 text-accent-foreground text-xs rounded-full whitespace-nowrap">
                  Admin
                </span>
              )}
            </div>
            <Button 
              variant="secondary" 
              className="w-full text-primary bg-primary-foreground hover:bg-primary-foreground/90 border border-transparent transition-all duration-200" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile header - improved with hamburger menu */}
      <header className="lg:hidden bg-gradient-to-r from-primary to-primary/90 text-primary-foreground flex justify-between items-center px-4 py-3 w-full fixed top-0 z-30 shadow-md">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="mr-2 text-primary-foreground p-1 h-9 w-9" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            <h1 className="text-base sm:text-lg font-bold truncate max-w-[200px] sm:max-w-none">Photofine Lab</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Avatar className="h-8 w-8 border border-primary-foreground/20">
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary-foreground ml-1 p-1 h-8 w-8" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <div className={cn(
        "lg:hidden fixed inset-0 bg-black/50 z-20 transition-opacity duration-300",
        mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )} onClick={() => setMobileMenuOpen(false)}>
        <div 
          className={cn(
            "bg-gradient-to-b from-primary to-primary/90 h-screen w-[270px] shadow-xl transition-transform duration-300 p-4",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center pb-4 mb-4 border-b border-primary-foreground/10">
            <Camera className="h-6 w-6 mr-2 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">Photofine Lab</h1>
          </div>
          
          <div className="flex flex-col space-y-1">
            {filteredNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10 transition-all duration-200",
                  "rounded-lg h-11 px-4 mb-1 relative overflow-hidden",
                  location.pathname === item.href && 
                  "bg-white/15 text-primary-foreground font-medium shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-white"
                )}
                onClick={() => {
                  navigate(item.href);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Button>
            ))}
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-foreground/10">
            <div className="flex items-center mb-3">
              <Avatar className="h-10 w-10 mr-3 border-2 border-primary-foreground/20">
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-foreground truncate">{user.name}</p>
                <p className="text-xs text-primary-foreground/70 truncate">{user.email}</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              className="w-full text-primary bg-primary-foreground hover:bg-primary-foreground/90 border border-transparent transition-all duration-200" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation - improved with active indicators */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t">
        <div className="flex justify-around items-center h-16">
          {filteredNavItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col h-14 px-1 sm:px-2 rounded-none w-full max-w-[100px] transition-all duration-200",
                location.pathname === item.href 
                  ? "bg-primary/5 text-primary border-t-2 border-primary" 
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary/80"
              )}
              onClick={() => navigate(item.href)}
            >
              <div className={cn(
                "p-1.5 rounded-full",
                location.pathname === item.href && "bg-primary/10"
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] sm:text-xs mt-1 truncate w-full text-center">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main content area - improved padding for mobile */}
      <main className="flex-1 pt-16 pb-20 px-3 sm:px-4 lg:pb-6 lg:pt-6 lg:px-8 lg:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto w-full py-3 sm:py-4">
          {children}
        </div>
      </main>
    </div>
  );
};
