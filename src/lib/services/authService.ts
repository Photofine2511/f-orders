import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Create a function to show auth-related toasts
export const showAuthToast = (title: string, description: string, isError: boolean = false) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: isError ? "destructive" : "default",
  });
};

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    
    // Store token and user data
    localStorage.setItem("photofine_token", response.data.token);
    localStorage.setItem("photofine_current_user", JSON.stringify(response.data.user));
    
    // Show login toast
    showAuthToast("Login Successful", "Welcome back!");
    
    return response.data;
  } catch (error) {
    // Show error toast
    showAuthToast("Login Failed", "Invalid email or password", true);
    throw error;
  }
};

export const logout = () => {
  // Clear local storage
  localStorage.removeItem("photofine_token");
  localStorage.removeItem("photofine_current_user");
  
  // Show logout toast
  showAuthToast("Logged Out", "You have been logged out successfully");
};

// ... existing code ...