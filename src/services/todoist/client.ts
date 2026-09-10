export const TODOIST_BASE_URL = 'https://api.todoist.com/rest/v2';

export class TodoistApiError extends Error {
  public statusCode?: number;
  public details?: any;

  constructor(message: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'TodoistApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function todoistFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, params, headers, ...customConfig } = options;

  // Retrieve token from options, env variable, or localStorage
  const activeToken =
    token ||
    (typeof window !== 'undefined' ? localStorage.getItem('todoist_api_token') : null) ||
    import.meta.env.VITE_TODOIST_API_TOKEN;

  if (!activeToken) {
    throw new TodoistApiError('Todoist API token is not configured.', 401);
  }

  let url = endpoint.startsWith('http') ? endpoint : `${TODOIST_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    'Authorization': `Bearer ${activeToken.trim()}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    // 204 No Content (e.g. Delete, Close)
    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      let errorMessage = `Todoist API Error (${response.status}): ${response.statusText}`;
      if (response.status === 401) {
        errorMessage = 'Invalid or expired Todoist API token. Please verify your token in Settings.';
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. You do not have permission for this resource.';
      } else if (response.status === 404) {
        errorMessage = 'Requested Todoist task or resource was not found.';
      } else if (response.status === 429) {
        errorMessage = 'Todoist API rate limit exceeded. Please wait a moment before trying again.';
      } else if (typeof errorData === 'string' && errorData) {
        errorMessage = errorData;
      } else if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }

      throw new TodoistApiError(errorMessage, response.status, errorData);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error instanceof TodoistApiError) {
      throw error;
    }
    // Network or offline error
    throw new TodoistApiError(
      error.message || 'Network error: Unable to connect to Todoist API.',
      0,
      error
    );
  }
}
