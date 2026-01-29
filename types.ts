// --- SUPER PROTOCOL DEFINITION ---
// Based on the AegisChat Technical Charter

export enum FrameType {
  DOCUMENT = 'DOCUMENT',
  OUTPUT = 'OUTPUT',
  AWAIT = 'AWAIT',
}

export enum AgentStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  WAITING = 'WAITING', // Blocked by Await
  FINALIZING = 'FINALIZING',
}

// Base Frame Interface
export interface AgentFrame {
  id: string;
  timestamp: number;
  type: FrameType;
  metadata?: {
    toolName?: string;
    duration?: number;
    confidence?: number; // 0-1
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    [key: string]: any;
  };
}

// 1. DOCUMENT FRAME
// Cognitive artifacts, plans, facts. Internal state.
export interface DocumentFrame extends AgentFrame {
  type: FrameType.DOCUMENT;
  title: string;
  contentType: 'PLAN' | 'ANALYSIS' | 'FACTS' | 'LOG';
  content: string | Record<string, any>; 
  isCollapsed?: boolean; // UI state hint
}

// 2. OUTPUT FRAME
// Consumable results. Final deliverables.
export interface OutputFrame extends AgentFrame {
  type: FrameType.OUTPUT;
  // Expanded types to support rich widgets
  contentType: 'TEXT' | 'JSON' | 'CODE' | 'MARKDOWN' | 'FILE' | 'TABLE' | 'CHART';
  // Allow objects for Chart/Table data
  content: string | Record<string, any>;
}

// 3. AWAIT FRAME
// Blocking state requiring external input.
export interface AwaitFrame extends AgentFrame {
  type: FrameType.AWAIT;
  message: string; // The prompt for the user/system
  schema?: {
    type: 'CONFIRMATION' | 'TEXT' | 'SELECTION' | 'FORM';
    options?: Array<{ label: string; value: string; description?: string }>;
    fields?: Array<{
        key: string;
        label: string;
        type: 'text' | 'date' | 'number' | 'boolean' | 'select';
        options?: string[];
        required?: boolean;
        description?: string;
    }>;
    defaultValue?: string;
  };
  resolved?: boolean;
  resolvedValue?: string | Record<string, any>; // The value provided by user
}

export type AnyFrame = DocumentFrame | OutputFrame | AwaitFrame;

export interface ExecutionContext {
  status: AgentStatus;
  currentObjective: string;
  activeSkill?: string;
  startTime: number;
}