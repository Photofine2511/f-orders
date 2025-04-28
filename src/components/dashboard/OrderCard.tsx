import { useState } from "react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Order } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { ChevronDown, ChevronUp, QrCode, Download, BookOpen } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { updateOrderStatus, getOrderDownloadUrl, debugOrderFile } from "@/lib/services/orderService";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/services/userService";
import { useNavigate } from "react-router-dom";

interface OrderCardProps {
  order: Order;
  isAdmin?: boolean;
  onStatusChange?: () => void;
}

export const OrderCard = ({ 
  order, 
  isAdmin = false,
  onStatusChange
}: OrderCardProps) => {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const navigate = useNavigate();
  
  // Get the order ID (could be either id or _id)
  const orderId = order._id || order.id;
  
  const handleStatusChange = async (newStatus: Order["status"]) => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID not found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Remember scroll position
      const scrollPosition = window.scrollY;
      
      await updateOrderStatus(orderId, newStatus);
      
      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus}`,
      });
      
      if (onStatusChange) {
        onStatusChange();
        
        // After state update, restore scroll position
        setTimeout(() => {
          window.scrollTo({
            top: scrollPosition,
            behavior: "auto"
          });
        }, 10);
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

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCreatedDate = () => {
    return formatDate(order.dateCreated || order.createdAt);
  };
  
  const getUpdatedDate = () => {
    return formatDate(order.dateUpdated || order.updatedAt);
  };

  const handleDownload = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID not found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Show a loading toast
      toast({
        title: "Processing download",
        description: "Preparing your file for download...",
      });
      
      // Get the download URL with token
      const downloadUrl = getOrderDownloadUrl(orderId);
      
      // Display downloading toast
      toast({
        title: "Download starting",
        description: "Your browser will handle the download shortly",
      });
      
      // Open in a new tab to handle the download properly
      // This method is more reliable than the anchor element approach
      window.open(downloadUrl, '_blank');
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Unable to download the file. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDebug = async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID not found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      const debugInfo = await debugOrderFile(orderId);
      setDebugData(debugInfo);
      setShowDebugDialog(true);
    } catch (error) {
      console.error('Debug error:', error);
      toast({
        title: "Debug Error",
        description: "Failed to retrieve debug information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Guard against malformed data
  if (!orderId) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Invalid order data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{order.albumName}</CardTitle>
            <CardDescription>
              Order #{orderId.toString().substring(0, 8)} • Created {getCreatedDate()}
            </CardDescription>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {order.pageType} • {order.lamination} Lamination
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2 text-sm border-t pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-muted-foreground">Page Type</Label>
                <p>{order.pageType}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Lamination</Label>
                <p>{order.lamination}</p>
              </div>
              {isAdmin && order.user && (
                <div>
                  <Label className="text-muted-foreground">Photographer</Label>
                  <p>{typeof order.user === 'string' ? order.user : order.user.name || 'Unknown'}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Cover Type</Label>
                <p>{order.coverType}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <p>{getUpdatedDate()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Transparent</Label>
                <p>{order.transparent ? "Yes" : "No"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Emboss</Label>
                <p>{order.emboss ? "Yes" : "No"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mini-Book</Label>
                <p>{order.miniBook ? "Yes" : "No"}</p>
              </div>
              {order.originalFilename && (
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <p className="truncate">{order.originalFilename}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div>
          {order.status === "Completed" && order.qrCode && (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mr-2">
                    <QrCode className="h-4 w-4 mr-2" /> View QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <div className="flex flex-col items-center p-6">
                    <h3 className="text-lg font-medium mb-4">Album QR Code</h3>
                    <div className="bg-white p-4 rounded-lg">
                      <QRCode value={order.qrCode} size={200} />
                    </div>
                    <p className="mt-4 text-sm text-center text-muted-foreground">
                      Scan this QR code to view the digital album on mobile
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate(`/album/${orderId}`)}
              >
                <BookOpen className="h-4 w-4 mr-2" /> View Album
              </Button>
            </>
          )}
        </div>

        <div className="space-x-2">
          {isAdmin && (
            <>
              {order.status === "Pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("Acknowledged")}
                  disabled={loading}
                >
                  Acknowledge
                </Button>
              )}
              {order.status === "Acknowledged" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("Printing")}
                  disabled={loading}
                >
                  Start Printing
                </Button>
              )}
              {order.status === "Printing" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("Completed")}
                  disabled={loading}
                >
                  Complete Order
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </>
          )}
        </div>
      </CardFooter>

      {/* Debug Dialog */}
      {isAdmin && debugData && (
        <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogTitle>File Debug Information</DialogTitle>
            <DialogDescription>
              Technical details about this file to help troubleshoot download issues
            </DialogDescription>
            <div className="mt-4 bg-muted/30 p-4 rounded-md overflow-auto max-h-96">
              <pre className="text-xs">{JSON.stringify(debugData, null, 2)}</pre>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowDebugDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
