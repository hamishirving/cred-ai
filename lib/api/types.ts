// Customer types - adjust based on actual backend response
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: "active" | "inactive" | "pending";
  createdAt?: string;
  // Add more fields as backend provides them
}

// Generic error response from tools
export interface ToolError {
  error: string;
}
