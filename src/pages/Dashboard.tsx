import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { getCurrentUser } from "@/lib/services/userService";
import { getMyOrders } from "@/lib/services/orderService";
import { Order, User } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";

const ORDERS_PER_PAGE = 2; // Number of orders to display per page

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [orderCountsByStatus, setOrderCountsByStatus] = useState({
    Pending: 0,
    Acknowledged: 0,
    Printing: 0,
    Completed: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Load user data once on component mount
  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (user && user.role === "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const orders = await getMyOrders();
      
      // Store all orders
      const ordersList = Array.isArray(orders) ? orders : [];
      setAllOrders(ordersList);
      
      // Get recent orders for display
      setRecentOrders(ordersList);
      
      // Calculate total pages
      const newTotalPages = Math.max(1, Math.ceil(ordersList.length / ORDERS_PER_PAGE));
      setTotalPages(newTotalPages);
      
      // Count orders by status
      const counts = {
        Pending: 0,
        Acknowledged: 0,
        Printing: 0,
        Completed: 0
      };
      
      if (Array.isArray(orders)) {
        orders.forEach(order => {
          if (counts[order.status] !== undefined) {
            counts[order.status]++;
          }
        });
      }
      
      setOrderCountsByStatus(counts);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders. Please try again later.');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user]);

  // Only load data on initial mount or when user changes
  useEffect(() => {
    if (user && isInitialLoad) {
      loadData();
    }
  }, [user, loadData, isInitialLoad]);
  
  // Apply pagination to orders
  useEffect(() => {
    if (recentOrders.length === 0) {
      setPaginatedOrders([]);
      return;
    }
    
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    const ordersOnCurrentPage = recentOrders.slice(startIndex, endIndex);
    
    setPaginatedOrders(ordersOnCurrentPage);
  }, [recentOrders, currentPage]);

  const handleRefresh = () => {
    loadData();
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="space-x-2">
            <Button onClick={() => navigate("/create-order")}>
              <Plus className="h-4 w-4 mr-2" /> New Order
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={handleRefresh}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl">{loading ? "..." : orderCountsByStatus.Pending}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <StatusBadge status="Pending" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription>Acknowledged</CardDescription>
              <CardTitle className="text-2xl">{loading ? "..." : orderCountsByStatus.Acknowledged}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <StatusBadge status="Acknowledged" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription>Printing</CardDescription>
              <CardTitle className="text-2xl">{loading ? "..." : orderCountsByStatus.Printing}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <StatusBadge status="Printing" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl">{loading ? "..." : orderCountsByStatus.Completed}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <StatusBadge status="Completed" />
            </CardContent>
          </Card>
        </div>

        {/* All orders with pagination */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Your Orders</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
              View All
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading orders...</span>
            </div>
          ) : recentOrders.length > 0 ? (
            <div>
              <div className="space-y-4 mb-6">
                {paginatedOrders.map((order) => (
                  <OrderCard key={order._id || order.id} order={order} onStatusChange={handleRefresh} />
                ))}
              </div>
              
              {/* Only show pagination if we have enough orders */}
              {recentOrders.length > ORDERS_PER_PAGE && (
                <div className="mt-6">
                  <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Showing {paginatedOrders.length} of {recentOrders.length} orders
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No orders yet. Create your first order!</p>
                <Button className="mt-4" onClick={() => navigate("/create-order")}>
                  <Plus className="h-4 w-4 mr-2" /> Create Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
