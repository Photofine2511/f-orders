import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { getCurrentUser } from "@/lib/services/userService";
import { getMyOrders } from "@/lib/services/orderService";
import { Order, OrderStatus } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

const ORDERS_PER_PAGE = 2; // Number of orders to display per page

const Orders = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OrderStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Use useCallback to prevent function recreation on each render
  const loadOrders = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userOrders = await getMyOrders();
      setOrders(Array.isArray(userOrders) ? userOrders : []);
      
      // Only apply filters when we have orders
      if (Array.isArray(userOrders)) {
        applyFilters(userOrders, searchQuery, activeTab);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      setError(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user, searchQuery, activeTab]);

  const applyFilters = (
    ordersList: Order[],
    query: string,
    status: OrderStatus | "All"
  ) => {
    let filtered = ordersList;
    
    // Filter by search query
    if (query) {
      filtered = filtered.filter(order => {
        const id = order.id || order._id || '';
        return (
          order.albumName.toLowerCase().includes(query.toLowerCase()) ||
          id.toString().toLowerCase().includes(query.toLowerCase())
        );
      });
    }
    
    // Filter by status
    if (status !== "All") {
      filtered = filtered.filter(order => order.status === status);
    }
    
    // Update the filtered orders
    setFilteredOrders(filtered);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Calculate total pages
    const newTotalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
    setTotalPages(newTotalPages);
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
    applyFilters(orders, query, activeTab);
  };

  const handleTabChange = (value: string) => {
    const status = value as OrderStatus | "All";
    setActiveTab(status);
    applyFilters(orders, searchQuery, status);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Only load on initial mount or when user changes
  useEffect(() => {
    // Set user from localStorage
    setUser(getCurrentUser());
  }, []);

  // Load orders only when needed
  useEffect(() => {
    if (user && isInitialLoad) {
      loadOrders();
    }
  }, [user, loadOrders, isInitialLoad]);

  const handleRefresh = () => {
    loadOrders();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Orders</h1>
          <Button onClick={() => navigate("/create-order")}>
            <Plus className="h-4 w-4 mr-2" /> New Order
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
              disabled={loading}
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
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
          
          <div className="pt-2 space-y-4">
            {renderOrdersContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  // Helper function to render orders content
  function renderOrdersContent() {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading orders...</span>
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
            : "No orders found. Create your first order!"}
        </p>
        {orders.length === 0 && (
          <Button className="mt-4" onClick={() => navigate("/create-order")}>
            <Plus className="h-4 w-4 mr-2" /> Create Order
          </Button>
        )}
      </div>
    );
  }
};

export default Orders;
