import { User, Order, Album } from "./types";

// Local storage keys
const USERS_KEY = "photofine_users";
const CURRENT_USER_KEY = "photofine_current_user";
const ALBUMS_KEY = "photofine_albums";
const ORDERS_KEY = "photofine_orders";

// Admin credentials
const ADMIN_EMAIL = "admin@photofine.com";
const ADMIN_PASSWORD = "admin123";

// Initialize localStorage with default data if empty
const initializeStorage = () => {
  // Create admin user
  const adminUser: User = {
    id: "admin-id",
    email: ADMIN_EMAIL,
    name: "Administrator",
    password: ADMIN_PASSWORD,
    role: "admin"
  };
  
  // Initialize or repair users data
  try {
    const usersData = localStorage.getItem(USERS_KEY);
    let users: User[] = [];
    
    if (usersData) {
      // Try to parse existing users data
      try {
        users = JSON.parse(usersData);
        // Validate that users is an array
        if (!Array.isArray(users)) {
          users = [];
        }
      } catch (e) {
        // Reset if corrupted
        users = [];
      }
    }
    
    // Check if admin exists, add if not
    const adminExists = users.some(user => user.email === ADMIN_EMAIL);
    if (!adminExists) {
      users.push(adminUser);
    }
    
    // Save validated users array
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    // If any error occurs, reset with just admin
    localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
  }
  
  // Initialize albums if needed
  if (!localStorage.getItem(ALBUMS_KEY)) {
    localStorage.setItem(ALBUMS_KEY, JSON.stringify([]));
  }
  
  // Initialize orders if needed
  if (!localStorage.getItem(ORDERS_KEY)) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([]));
  }
};

// User management
export const getUsers = (): User[] => {
  try {
    const users = localStorage.getItem(USERS_KEY);
    if (!users) return [];
    
    const parsedUsers = JSON.parse(users);
    // Validate that users is an array
    if (!Array.isArray(parsedUsers)) {
      // Re-initialize storage if corrupted
      initializeStorage();
      return getUsers(); // Retry
    }
    
    return parsedUsers;
  } catch (e) {
    // If parsing fails, reset storage and return empty array
    initializeStorage();
    return getUsers(); // Retry once after initialization
  }
};

export const getCurrentUser = (): User | null => {
  try {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    if (!user) return null;
    
    const parsedUser = JSON.parse(user);
    
    // Validate that user has required fields
    if (!parsedUser || !parsedUser.id || !parsedUser.email || !parsedUser.role) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
    
    return parsedUser;
  } catch (e) {
    // If parsing fails, remove corrupt data
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
};

export const registerUser = (user: Omit<User, "id" | "role">): User => {
  try {
    const users = getUsers();
    
    // Validate that users is an array
    if (!Array.isArray(users)) {
      // Re-initialize storage if data is corrupted
      initializeStorage();
      return registerUser(user); // Retry with fresh data
    }
    
    const existingUser = users.find((u) => u.email === user.email);
    
    if (existingUser) {
      throw new Error("User already exists with this email");
    }
    
    // Validate required fields
    if (!user.email || !user.name || !user.password) {
      throw new Error("Email, name and password are required");
    }
    
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      role: "user" // Default role
    };
    
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    return newUser;
  } catch (error) {
    if (error instanceof Error && error.message === "User already exists with this email") {
      throw error; // Rethrow specific error
    }
    
    // For other errors, try to fix storage and retry
    initializeStorage();
    
    // If still fails after re-initialization, throw a generic error
    try {
      const users = getUsers();
      const newUser: User = {
        ...user,
        id: crypto.randomUUID(),
        role: "user"
      };
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
      return newUser;
    } catch (e) {
      throw new Error("Registration failed. Please try again.");
    }
  }
};

export const loginUser = (email: string, password: string): User => {
  try {
    const users = getUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error("Invalid email or password");
    }
    
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    // Re-initialize storage if we encounter errors
    initializeStorage();
    
    // Try again with admin credentials if they match
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const users = getUsers();
      const adminUser = users.find(u => u.email === ADMIN_EMAIL);
      
      if (adminUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(adminUser));
        return adminUser;
      }
    }
    
    throw new Error("Invalid email or password");
  }
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Album management
export const getAlbums = (userId?: string): Album[] => {
  const albums = localStorage.getItem(ALBUMS_KEY);
  const parsedAlbums = albums ? JSON.parse(albums) : [];
  
  if (userId) {
    return parsedAlbums.filter((album: Album) => album.userId === userId);
  }
  
  return parsedAlbums;
};

export const createAlbum = (album: Omit<Album, "id">): Album => {
  const albums = getAlbums();
  const newAlbum: Album = {
    ...album,
    id: crypto.randomUUID(),
  };
  
  localStorage.setItem(ALBUMS_KEY, JSON.stringify([...albums, newAlbum]));
  return newAlbum;
};

// Order management
export const getOrders = (userId?: string): Order[] => {
  const orders = localStorage.getItem(ORDERS_KEY);
  const parsedOrders: Order[] = orders ? JSON.parse(orders) : [];
  
  if (userId) {
    return parsedOrders.filter((order) => order.userId === userId);
  }
  
  return parsedOrders;
};

export const getOrder = (orderId: string): Order | undefined => {
  const orders = getOrders();
  return orders.find((order) => order.id === orderId);
};

export const createOrder = (order: Omit<Order, "id" | "dateCreated" | "dateUpdated" | "status">): Order => {
  const orders = getOrders();
  const newOrder: Order = {
    ...order,
    id: crypto.randomUUID(),
    dateCreated: new Date().toISOString(),
    dateUpdated: new Date().toISOString(),
    status: "Pending",
  };
  
  localStorage.setItem(ORDERS_KEY, JSON.stringify([...orders, newOrder]));
  return newOrder;
};

export const updateOrderStatus = (orderId: string, status: Order["status"]): Order => {
  const orders = getOrders();
  const orderIndex = orders.findIndex((order) => order.id === orderId);
  
  if (orderIndex === -1) {
    throw new Error("Order not found");
  }
  
  // Generate QR code if status is completed
  let qrCode: string | undefined;
  if (status === "Completed") {
    // In real app, this would be generated properly
    qrCode = `https://photofine.example.com/album/${orderId}`;
  }
  
  const updatedOrder: Order = {
    ...orders[orderIndex],
    status,
    dateUpdated: new Date().toISOString(),
    qrCode,
  };
  
  orders[orderIndex] = updatedOrder;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return updatedOrder;
};

// Debugging helper to reset storage (useful for development)
export const resetStorage = () => {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(ALBUMS_KEY);
  localStorage.removeItem(ORDERS_KEY);
  initializeStorage();
};

// Initialize storage on load
initializeStorage();
// Force re-initialization to fix any corrupted data
resetStorage();
