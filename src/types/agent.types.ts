export interface AgentContext {
  clientId: string;
  userId: string;
  userRole: "owner" | "staff" | "manager";
  workerName: string;
  activeStartDate?: string; 
  activeEndDate?: string; 
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
}