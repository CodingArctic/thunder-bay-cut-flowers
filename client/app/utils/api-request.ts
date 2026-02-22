type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

export const apiRequest = async <T = unknown>(
  url: string,
  method: HttpMethod = 'GET',
  body: Record<string, unknown> | FormData | null = null,
  headers: Record<string, string> = {}
): Promise<T | null> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl && process.env.NODE_ENV === 'development') {
    console.warn('apiRequest: NEXT_PUBLIC_API_BASE_URL is not set');
  }

  const normalizedMethod = method.toUpperCase() as HttpMethod;

  try {
    const fetchOptions: RequestInit = {
      method: normalizedMethod,
      credentials: 'include',
      headers: { ...headers },
    };

    if (BODY_METHODS.includes(normalizedMethod)) {
      if (body instanceof FormData) {
        fetchOptions.body = body;
      } else if (body !== null) {
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
      }
    }

    const response = await fetch(`${baseUrl}${url}`, fetchOptions);

    if (!response.ok) {
      let errorMessage = `HTTP error: ${response.status} ${response.statusText}`;
      let errorData: Record<string, unknown> | null = null;

      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error as string;
          } else if (errorData?.message) {
            errorMessage = errorData.message as string;
          }
        }
      } catch {
        // Use default error message if body parsing fails
      }

      throw Object.assign(new Error(errorMessage), {
        status: response.status,
        isHttpError: true,
        data: errorData,
      });
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    if ((error as { isHttpError?: boolean }).isHttpError) {
      throw error;
    }

    throw Object.assign(
      new Error((error as Error).message || 'Network error'),
      { isNetworkError: true, originalError: error }
    );
  }
};
