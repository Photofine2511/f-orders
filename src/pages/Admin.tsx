import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { getCurrentUser } from "@/lib/services/userService";
import { getAllOrders } from "@/lib/services/orderService";
import { Order, OrderStatus } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

const ORDERS_PER_PAGE = 2; // Number of orders to display per page

const Admin = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OrderStatus | "All">("All");
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    acknowledged: 0,
    printing: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Check if user exists and is admin
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (currentUser.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    loadOrders();
  }, [currentUser, navigate]);

  const loadOrders = async (preservePosition = false) => {
    try {
      // Only show loading when we're not preserving position
      if (!preservePosition) {
        setLoading(true);
      }
      setError(null);
      
      // Remember scroll position if we need to preserve it
      const scrollPosition = preservePosition ? window.scrollY : 0;
      
      // Get all orders from MongoDB API
      const allOrders = await getAllOrders();
      
      setOrders(allOrders);
      applyFilters(allOrders, searchQuery, activeTab, preservePosition);
      
      // Calculate order statistics
      const stats = {
        total: allOrders.length,
        pending: allOrders.filter(order => order.status === "Pending").length,
        acknowledged: allOrders.filter(order => order.status === "Acknowledged").length,
        printing: allOrders.filter(order => order.status === "Printing").length,
        completed: allOrders.filter(order => order.status === "Completed").length
      };
      setOrderStats(stats);
      
      // Restore scroll position if needed
      if (preservePosition) {
        setTimeout(() => {
          window.scrollTo({
            top: scrollPosition,
            behavior: "auto" 
          });
        }, 10);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (
    ordersList: Order[],
    query: string,
    status: OrderStatus | "All",
    preserveCurrentPage = false
  ) => {
    let filtered = ordersList;
    
    // Filter by search query
    if (query) {
      filtered = filtered.filter(order => 
        (order.albumName && order.albumName.toLowerCase().includes(query.toLowerCase())) ||
        (order._id && order._id.toLowerCase().includes(query.toLowerCase())) ||
        (order.id && order.id.toLowerCase().includes(query.toLowerCase()))
      );
    }
    
    // Filter by status
    if (status !== "All") {
      filtered = filtered.filter(order => order.status === status);
    }
    
    // Update filtered orders
    setFilteredOrders(filtered);
    
    // Reset to first page only when not preserving position
    // This way, when we refresh after status update, we stay on the same page
    if (!preserveCurrentPage) {
      setCurrentPage(1);
    }
    
    // Calculate total pages
    const newTotalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
    setTotalPages(newTotalPages);
    
    // If current page is greater than the new total pages, adjust it
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  };
  
  // Apply pagination to the filtered orders
  useEffect(() => {
    if (filteredOrders.length === 0) {
      setPaginatedOrders([]);
      return;
    }
    
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    const endIndex = startIndex + ORDERS_PER_PAGE;
    const ordersOnCurrentPage = filteredOrders.slice(startIndex, endIndex);
    
    setPaginatedOrders(ordersOnCurrentPage);
  }, [filteredOrders, currentPage]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(orders, query, activeTab, false);
  };

  const handleTabChange = (value: string) => {
    const status = value as OrderStatus | "All";
    setActiveTab(status);
    applyFilters(orders, searchQuery, status, false);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    loadOrders(true);  // true = preserve position
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={() => loadOrders(false)} disabled={loading}>
            Refresh
          </Button>
        </div>
        
        {/* Order Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">{loading ? "..." : orderStats.total}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">{loading ? "..." : orderStats.pending}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <StatusBadge status="Pending" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription>Acknowledged</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">{loading ? "..." : orderStats.acknowledged}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <StatusBadge status="Acknowledged" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription>Printing</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">{loading ? "..." : orderStats.printing}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <StatusBadge status="Printing" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-xl sm:text-2xl">{loading ? "..." : orderStats.completed}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <StatusBadge status="Completed" />
            </CardContent>
          </Card>
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

        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders by album name or ID..."
            className="pl-8"
            value={searchQuery}
            onChange={handleSearch}
            disabled={loading}
          />
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block">
          <Tabs defaultValue="All" onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="All" disabled={loading}>All</TabsTrigger>
              <TabsTrigger value="Pending" disabled={loading}>Pending</TabsTrigger>
              <TabsTrigger value="Acknowledged" disabled={loading}>Acknowledged</TabsTrigger>
              <TabsTrigger value="Printing" disabled={loading}>Printing</TabsTrigger>
              <TabsTrigger value="Completed" disabled={loading}>Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              {renderOrdersContent()}
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile Filter Buttons */}
        <div className="sm:hidden space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filter by status:</h3>
            <span className="text-xs text-muted-foreground">
              {activeTab !== "All" ? `Showing: ${activeTab}` : "Showing: All Orders"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeTab === "All" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => handleTabChange("All")}
              disabled={loading}
            >
              All
            </Button>
            <Button
              variant={activeTab === "Pending" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => handleTabChange("Pending")}
              disabled={loading}
            >
              Pending
            </Button>
            <Button
              variant={activeTab === "Acknowledged" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => handleTabChange("Acknowledged")}
              disabled={loading}
            >
              Acknowledged
            </Button>
            <Button
              variant={activeTab === "Printing" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => handleTabChange("Printing")}
              disabled={loading}
            >
              Printing
            </Button>
            <Button
              variant={activeTab === "Completed" ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => handleTabChange("Completed")}
              disabled={loading}
            >
              Completed
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  // Helper function to render orders content
  function renderOrdersContent() {
    if (loading) {
      return (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-8 text-center text-destructive">
          <p>{error}</p>
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      );
    }
    
    if (filteredOrders.length > 0) {
      return (
        <div>
          <div className="space-y-4 mb-6">
            {paginatedOrders.map((order) => (
              <OrderCard 
                key={order._id || order.id} 
                order={order} 
                isAdmin={true}
                onStatusChange={handleRefresh}
              />
            ))}
          </div>
          
          {/* Only show pagination if we have enough orders */}
          {filteredOrders.length > ORDERS_PER_PAGE && (
            <div className="mt-6">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
              <div className="text-center text-sm text-muted-foreground mt-2">
                Showing {paginatedOrders.length} of {filteredOrders.length} orders
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">
          {orders.length > 0 
            ? "No orders match your search criteria" 
            : "No orders found."}
        </p>
      </div>
    );
  }
};

export default Admin;
