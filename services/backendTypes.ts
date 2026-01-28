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
  sessionState: 'ACTIVE' | string;
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
  content: string;
}

/**
 * Backend API Contract: Resume Execution
 */
export interface ResumeRequest {
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