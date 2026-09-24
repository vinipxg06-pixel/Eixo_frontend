async function apiRequest(path, options = {}) {
  const response = await fetch(`${EIXO_CONFIG.API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  let body = null;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    body = await response.json();
  }

  if (!response.ok) {
    const error = new Error(body?.message || `Erro ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}
