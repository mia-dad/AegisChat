import { CreateSessionResponse, TurnResponse, TurnRequest, ResumeRequest, ApiError, ApiErrorResponse, CreateSessionRequest } from './backendTypes';

// Use relative path so requests go through the Vite proxy (defined in vite.config.ts).
// This avoids CORS errors because the browser thinks it's talking to the same origin.
const API_BASE_URL = '/api/agent';

/**
 * Helper to handle fetch responses and standardize errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  // Try to parse structured error from backend
  let errorData: ApiErrorResponse | null = null;
  try {
    errorData = await response.json();
  } catch (e) {
    // Response wasn't JSON
  }

  const message = errorData?.message || `请求失败，状态码 ${response.status}`;
  const errorCode = errorData?.errorCode || 'UNKNOWN_ERROR';

  throw new ApiError(message, errorCode, response.status);
}

/**
 * Initialize a new chat session with a goal
 * POST /api/agent/sessions
 */
export const createSession = async (goal: string): Promise<CreateSessionResponse> => {
  try {
    const payload: CreateSessionRequest = { goal };
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CreateSessionResponse>(response);
  } catch (error) {
    console.error('Failed to create session:', error);
    if (error instanceof ApiError) throw error;
    // Handle network errors (e.g. Failed to fetch)
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`网络错误: ${msg}。请检查后端连接。`);
  }
};

/**
 * Execute a conversation turn
 * POST /api/agent/sessions/{sessionId}/turns
 */
export const executeTurn = async (sessionId: string, content: string): Promise<TurnResponse> => {
  try {
    const payload: TurnRequest = { content };
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/turns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<TurnResponse>(response);
  } catch (error) {
    console.error('Failed to execute turn:', error);
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`网络错误: ${msg}`);
  }
};

/**
 * Resume a blocked session with structured input
 * POST /api/agent/sessions/{sessionId}/resume
 */
export const resumeSession = async (sessionId: string, structuredInput: Record<string, any>): Promise<TurnResponse> => {
  try {
    const payload: ResumeRequest = { structuredInput };
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<TurnResponse>(response);
  } catch (error) {
    console.error('Failed to resume session:', error);
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`网络错误: ${msg}`);
  }
};