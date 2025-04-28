import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageType, LaminationType, CoverType } from "@/lib/types";
import { createOrder } from "@/lib/services/orderService";
import { getCurrentUser } from "@/lib/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Cloud, FileUp } from "lucide-react";

interface OrderFormProps {
  albumName: string;
  albumFile: File;
}

export const OrderForm = ({ albumName, albumFile }: OrderFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Set user in state on component mount
  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const [orderDetails, setOrderDetails] = useState({
    pageType: "Regular" as PageType,
    lamination: "Glossy" as LaminationType,
    transparent: false,
    emboss: false,
    miniBook: false,
    coverType: "Matte" as CoverType,
  });

  const handleChange = (
    field: keyof typeof orderDetails,
    value: string | boolean
  ) => {
    setOrderDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an order",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Set both loading and submitting state to prevent multiple submissions
      setLoading(true);
      setSubmitting(true);
      setUploadStatus('uploading');
      setStatusMessage('Preparing to upload your file...');
      
      // Start with initial progress
      setUploadProgress(5);
      
      // Create FormData for multipart file upload
      const formData = new FormData();
      formData.append('file', albumFile);
      formData.append('albumName', albumName);
      formData.append('pageType', orderDetails.pageType);
      formData.append('lamination', orderDetails.lamination);
      formData.append('transparent', orderDetails.transparent.toString());
      formData.append('emboss', orderDetails.emboss.toString());
      formData.append('miniBook', orderDetails.miniBook.toString());
      formData.append('coverType', orderDetails.coverType);
      
      // Update status message for upload start
      setStatusMessage('Creating Your Order...');
      
      // Send the request with progress tracking
      await createOrder(formData, (progressEvent) => {
        // Update progress based on actual upload progress
        if (progressEvent.percentage) {
          setUploadProgress(progressEvent.percentage);
          
          // Update status messages based on progress with percentage
          setStatusMessage(`Creating Your Order... ${progressEvent.percentage}%`);
          
          // Change to processing state when almost complete
          if (progressEvent.percentage > 90 && uploadStatus === 'uploading') {
            setStatusMessage('Finalizing your order...');
            setUploadStatus('processing');
          }
        }
      });
      
      // Set final progress and status
      setUploadProgress(100);
      setUploadStatus('complete');
      setStatusMessage('Upload complete!');
      
      toast({
        title: "Order Created",
        description: "Your order has been created successfully",
      });
      
      // Short delay before redirecting
      setTimeout(() => {
        // Use replace instead of navigate to avoid keeping the create order page in history
        // Adding a timestamp query parameter to force a fresh load of the Orders page
        navigate("/orders?created=" + Date.now(), { replace: true });
      }, 1000);
    } catch (error: any) {
      setSubmitting(false);
      setUploadStatus('error');
      setStatusMessage('Upload failed. Please try again.');
      toast({
        title: "Error",
        description: error.response?.data?.message || "An error occurred while creating your order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">
          Order Details for "{albumName}"
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure your album specifications
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="page-type">Page Type</Label>
          <Select
            defaultValue={orderDetails.pageType}
            onValueChange={(value) => handleChange("pageType", value as PageType)}
          >
            <SelectTrigger id="page-type">
              <SelectValue placeholder="Select page type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="NT-Slim">NT-Slim</SelectItem>
              <SelectItem value="NT-Thick">NT-Thick</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lamination">Lamination</Label>
          <Select
            defaultValue={orderDetails.lamination}
            onValueChange={(value) => handleChange("lamination", value as LaminationType)}
          >
            <SelectTrigger id="lamination">
              <SelectValue placeholder="Select lamination type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Glossy">Glossy</SelectItem>
              <SelectItem value="Matte">Matte</SelectItem>
              <SelectItem value="Velvet">Velvet</SelectItem>
              <SelectItem value="Texture">Texture</SelectItem>
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-type">Cover Type</Label>
          <Select
            defaultValue={orderDetails.coverType}
            onValueChange={(value) => handleChange("coverType", value as CoverType)}
          >
            <SelectTrigger id="cover-type">
              <SelectValue placeholder="Select cover type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Matte">Matte</SelectItem>
              <SelectItem value="Glossy">Glossy</SelectItem>
              <SelectItem value="Velvet">Velvet</SelectItem>
              <SelectItem value="Texture">Texture</SelectItem>
              <SelectItem value="Sparkle">Sparkle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Transparent</Label>
          <RadioGroup
            defaultValue={orderDetails.transparent ? "yes" : "no"}
            onValueChange={(value) => handleChange("transparent", value === "yes")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="transparent-yes" />
              <Label htmlFor="transparent-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="transparent-no" />
              <Label htmlFor="transparent-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Emboss</Label>
          <RadioGroup
            defaultValue={orderDetails.emboss ? "yes" : "no"}
            onValueChange={(value) => handleChange("emboss", value === "yes")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="emboss-yes" />
              <Label htmlFor="emboss-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="emboss-no" />
              <Label htmlFor="emboss-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Mini-Book</Label>
          <RadioGroup
            defaultValue={orderDetails.miniBook ? "yes" : "no"}
            onValueChange={(value) => handleChange("miniBook", value === "yes")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="mini-book-yes" />
              <Label htmlFor="mini-book-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="mini-book-no" />
              <Label htmlFor="mini-book-no">No</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Upload progress section */}
      {loading && (
        <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-3">
            {uploadStatus === 'uploading' && (
              <FileUp className="h-5 w-5 text-primary animate-pulse" />
            )}
            {uploadStatus === 'processing' && (
              <Cloud className="h-5 w-5 text-primary animate-pulse" />
            )}
            {uploadStatus === 'complete' && (
              <Cloud className="h-5 w-5 text-green-500" />
            )}
            {uploadStatus === 'error' && (
              <Cloud className="h-5 w-5 text-destructive" />
            )}
            <div className="text-sm font-medium">{statusMessage}</div>
          </div>
          
          <Progress value={uploadProgress} className="h-2" />
          
          <div className="text-xs text-muted-foreground">
            {uploadStatus === 'uploading' && (
              <span>Please don't close this page while your order is being created...</span>
            )}
            {uploadStatus === 'processing' && (
              <span>Almost done! Finalizing your order...</span>
            )}
            {uploadStatus === 'complete' && (
              <span>Order created successfully! Redirecting to your orders...</span>
            )}
            {uploadStatus === 'error' && (
              <span>There was a problem creating your order. Please try again.</span>
            )}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading || submitting}>
        {!loading ? "Submit Order" : uploadStatus === 'complete' ? "Order Submitted!" : "Uploading..."}
      </Button>
    </form>
  );
};
