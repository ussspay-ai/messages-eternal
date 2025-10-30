/**
 * Type definitions for supabase-client wrapper
 */

export interface AgentSnapshot {
  agent_id: string;
  timestamp: string;
  account_value: number;
  total_pnl: number;
  return_percent: number;
  win_rate: number;
  trades_count: number;
  sharpe_ratio?: number;
  active_positions?: number;
}

export interface FundingHistoryRecord {
  [key: string]: any;
}

export interface PickabooAdmin {
  [key: string]: any;
}

export interface AgentTrade {
  [key: string]: any;
}

export interface AgentSignal {
  [key: string]: any;
}

export interface AgentThinking {
  [key: string]: any;
}

export interface AgentStatusRecord {
  [key: string]: any;
}

export interface AgentDecisionLog {
  [key: string]: any;
}

export interface ExitPlan {
  [key: string]: any;
}

export interface AgentChatMessage {
  [key: string]: any;
}

export declare const supabase: any;

export declare function saveAgentSnapshots(snapshots: AgentSnapshot[]): Promise<boolean>;
export declare function getAgentSnapshots(
  agentId: string,
  startTime: Date,
  endTime: Date
): Promise<AgentSnapshot[]>;
export declare function getLatestSnapshots(agentIds: string[]): Promise<Record<string, AgentSnapshot>>;

export declare function saveFundingHistory(record: FundingHistoryRecord): Promise<boolean>;
export declare function getAgentFundingHistory(agentId: string): Promise<FundingHistoryRecord[]>;
export declare function getAllFundingHistory(): Promise<FundingHistoryRecord[]>;
export declare function getFundingStats(agentId: string): Promise<any>;

export declare function isPickabooAdminWhitelisted(address: string): Promise<boolean>;
export declare function getPickabooAdmins(): Promise<PickabooAdmin[]>;
export declare function addPickabooAdmin(address: string, name: string): Promise<boolean>;
export declare function removePickabooAdmin(address: string): Promise<boolean>;

export declare function getCurrentTradingSymbol(): Promise<string>;
export declare function getAllTradingSymbols(): Promise<Record<string, string>>;

export declare function saveAgentTrade(trade: AgentTrade): Promise<boolean>;
export declare function getAgentTrades(agentId: string): Promise<AgentTrade[]>;

export declare function saveAgentSignal(signal: AgentSignal): Promise<boolean>;
export declare function getAgentSignals(agentId: string): Promise<AgentSignal[]>;

export declare function saveAgentThinking(thinking: AgentThinking): Promise<boolean>;
export declare function getAgentThinking(agentId: string): Promise<AgentThinking[]>;

export declare function updateAgentStatus(status: AgentStatusRecord): Promise<boolean>;
export declare function getAgentStatus(agentId: string): Promise<AgentStatusRecord>;
export declare function getAllAgentStatuses(): Promise<AgentStatusRecord[]>;

export declare function saveAgentDecision(decision: AgentDecisionLog): Promise<boolean>;

export declare function saveExitPlan(plan: ExitPlan): Promise<boolean>;
export declare function getActiveExitPlans(agentId: string): Promise<ExitPlan[]>;
export declare function getLatestExitPlan(agentId: string): Promise<ExitPlan | null>;
export declare function closeExitPlan(planId: string, exitPrice: number, exitTime: string): Promise<boolean>;

export declare function saveAgentChatMessage(message: AgentChatMessage): Promise<boolean>;