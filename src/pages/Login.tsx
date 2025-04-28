import { AuthForm } from "@/components/auth/AuthForm";
import { Camera } from "lucide-react";

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Camera className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-center">Photofine Orders</h1>
        </div>
        <p className="text-center text-muted-foreground mb-8">Sign in to access your photo albums</p>
        <AuthForm mode="login" />
      </div>
    </div>
  );
};

export default Login;

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!email || !password) {
    toast({
      title: "Error",
      description: "Please enter both email and password",
      variant: "destructive",
    });
    return;
  }
  
  try {
    setLoading(true);
    const data = await login(email, password);
    
    // Toast is now handled in the login function
    
    // Redirect based on user role
    if (data.user.role === "admin") {
      navigate("/admin");
    } else if (data.user.role === "photographer") {
      navigate("/orders");
    } else {
      navigate("/");
    }
  } catch (error) {
    // Toast is now handled in the login function
    console.error("Login error:", error);
  } finally {
    setLoading(false);
  }
};
