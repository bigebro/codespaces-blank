export interface AgentContext {
  clientId: string;
  userId: string;
  userRole: "owner" | "staff" | "manager";
  workerName: string;
  activeStartDate?: string;
  activeEndDate?: string;
  rangeMode?: "day" | "week" | "month";
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
}
