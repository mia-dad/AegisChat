/**
 * UI Message definition
 */
export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string; // Fallback text representation
  payload?: {
    outputs?: OutputDto[];
    [key: string]: any;
  };
  isError?: boolean;
  timestamp: number;
  // Store the interaction specification for rich UI rendering
  awaitSpec?: AwaitSpec;
}

/**
 * Output Types for Unified Classification
 */
export enum OutputType {
  TEXT = 'text',
  FILE = 'file',
  TABLE = 'table',
  CHART = 'chart'
}

export interface OutputDto {
  type: OutputType;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Interaction Specification
 * Defines how the UI should render the agent's request for information
 */
export interface AwaitSpec {
  // Frontend internal types
  type?: 'QUESTION' | 'CONFIRMATION' | 'SELECTION' | 'FORM' | string;
  
  // Backend raw fields
  awaitReason?: string;
  confirmation?: boolean;
  
  // Legacy schema support
  expectedSchema?: Record<string, any>;
  
  // New schema support
  inputSchema?: Record<string, {
    type: string;
    description?: string;
    required?: boolean;
    options?: string[]; // Enum support
    [key: string]: any;
  }>;

  // Frontend mapped fields
  message?: string;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
  fields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'boolean' | 'select';
    options?: string[];
    required?: boolean;
    description?: string;
  }>;
  
  [key: string]: any;
}

/**
 * Backend API Contract: Session Creation
 */
export interface CreateSessionRequest {
  goal: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  // Backend returns 'state', legacy might expect 'sessionState'
  state?: string;
  sessionState?: string;
  createdAt?: string;
  
  // Merging generic response fields that might be present
  executionStatus?: string;
  outputs?: OutputDto[];
  awaitSpec?: AwaitSpec;
  message?: string;
}

/**
 * Backend API Contract: Turn Execution
 */
export interface TurnRequest {
  content?: string; // 正常用户输入
  confirmationChoice?: ConfirmationChoice; // 意图确认选择 (Feature 017)
}

/**
 * Backend API Contract: Resume Execution
 */
export interface ResumeRequest {
  content?: string; // 用户原始输入文本，用于意图偏离检测
  structuredInput: Record<string, any>;
}

export interface TurnResponse {
  // New Execution Status
  executionStatus: 'BLOCKED' | 'SUCCESS' | 'COMPLETED' | 'FAILED' | 'TERMINATED' | 'AWAITING_INPUT' | string;

  sessionState: 'ACTIVE' | 'AWAITING_INPUT' | 'COMPLETED' | 'FAILED' | 'TERMINATED' | string;
  turnState: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'AWAITING' | 'FAILED' | string;

  // New Unified Output Fields
  outputs?: OutputDto[];
  awaitSpec?: AwaitSpec;
  message?: string;
  error?: { code: string; message: string };

  // Legacy fields (optional support for transition)
  resultPayload?: any;

  // Feature 017: 意图治理新增字段
  confirmationTurn?: IntentConfirmationTurn | null; // 确认回合负载
  newSessionId?: string | null; // 用户选择 ABANDON_CURRENT 后的新 Session ID
  intentAnchor?: IntentAnchor | null; // 当前 Session 的意图锚点
}

/**
 * Backend API Contract: Error Response
 */
export interface ApiErrorResponse {
  errorCode: string;
  message: string;
}

export class ApiError extends Error {
  errorCode: string;
  status: number;

  constructor(message: string, errorCode: string, status: number) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }
}

// ============================================================================
// 意图治理类型定义 (Feature 017)
// ============================================================================

/**
 * 意图确认回合数据结构
 */
export interface IntentConfirmationTurn {
  type: 'INTENT_CONFIRMATION'; // 固定值
  currentIntent: IntentInfo;
  detectedIntent: DetectedIntent;
  driftCategory: DriftCategory;
  options: ConfirmationChoice[];
}

/**
 * 当前意图信息
 */
export interface IntentInfo {
  intentId: string; // UUID
  intentLabel: string; // 意图名称，可展示给用户
  createdAtTurn: number; // 该意图在第几轮被识别
  confidence: number; // 置信度 (0.0 - 1.0)
  locked: boolean; // 是否已锁定
}

/**
 * 检测到的新意图
 */
export interface DetectedIntent {
  intentLabel: string; // 新意图名称
  confidence: number; // 新意图置信度
  sourceInput: string; // 触发该意图的用户原文
}

/**
 * 意图漂移类别
 */
export type DriftCategory = 'AMBIGUOUS' | 'DRIFT';

/**
 * 确认选择
 */
export type ConfirmationChoice = 'CONTINUE_CURRENT' | 'ABANDON_CURRENT';

/**
 * 意图锚点信息
 */
export interface IntentAnchor {
  intentId: string;
  intentLabel: string;
  createdAtTurn: number;
  confidence: number;
  locked: boolean;
}

/**
 * 待处理的确认回合
 */
export type PendingConfirmation = IntentConfirmationTurn;