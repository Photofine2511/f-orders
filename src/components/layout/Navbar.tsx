import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/types";
import { LogOut, User as UserIcon, ClipboardList, Home, Settings, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar = ({ user, onLogout }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  // Define navigation items with their routes and access control
  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      roles: ["user", "admin"]
    },
    {
      href: "/orders",
      label: "Orders",
      icon: <ClipboardList className="h-5 w-5" />,
      roles: ["user", "admin"]
    },
    {
      href: "/create-order",
      label: "New Order",
      icon: <Plus className="h-5 w-5" />,
      roles: ["user", "admin"]
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
    user && item.roles.includes(user.role)
  );

  if (!user) return null;

  return (
    <nav className="bg-primary text-primary-foreground py-2 px-4 fixed top-0 left-0 right-0 z-50 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and brand name */}
        <Link to="/dashboard" className="font-bold text-xl flex items-center">
          Photofine Color Lab
        </Link>

        {/* Navigation links - desktop */}
        <div className="hidden md:flex items-center space-x-1">
          {filteredNavItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "text-primary-foreground hover:bg-primary/90",
                location.pathname === item.href && "bg-primary/90"
              )}
              onClick={() => navigate(item.href)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </div>

        {/* User info and logout */}
        <div className="flex items-center">
          <div className="hidden md:flex items-center mr-4">
            <UserIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">{user.name}</span>
            {isAdmin && (
              <span className="ml-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                Admin
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> 
            <span className="hidden md:inline">Log Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}; 