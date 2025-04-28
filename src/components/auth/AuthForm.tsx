import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { loginUser, registerUser } from "@/lib/services/userService";
import { useNavigate } from "react-router-dom";

type AuthFormProps = {
  mode: "login" | "register";
};

export const AuthForm = ({ mode }: AuthFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === "register") {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        await registerUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        
        toast({
          title: "Success",
          description: "Account created successfully. Please log in.",
        });
        
        navigate("/login");
      } else {
        const user = await loginUser(formData.email, formData.password);
        
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        
        // Redirect based on user role
        if (user.role === "admin") {
          navigate("/admin"); // Admin users go to the admin dashboard
        } else {
          navigate("/dashboard"); // Regular users go to the normal dashboard
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {mode === "login" ? "Welcome Back" : "Create an Account"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Log in to manage your photo orders"
            : "Register to start processing your photo albums"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Register"}
          </Button>
          <div className="text-sm text-center mt-4">
            {mode === "login" ? (
              <span>
                Don't have an account?{" "}
                <a href="/register" className="text-primary hover:underline">
                  Register here
                </a>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <a href="/login" className="text-primary hover:underline">
                  Log in
                </a>
              </span>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};
