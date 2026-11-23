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

/**
 * Leitura dos erros da API. O backend responde sempre no formato ErroPadrao:
 * { status, error, message, path, errors?: [{ field, message }] } — "errors" só em erros de validação.
 */
const ApiErros = {
  /** Mensagem para exibir ao usuário; usa o fallback quando a API não explica o erro. */
  mensagem(error, fallback) {
    if (error?.body?.message) return error.body.message;
    const mensagemTecnica = !error?.message || /^Erro \d+$/.test(error.message) || error.message === 'Failed to fetch';
    return mensagemTecnica ? fallback : error.message;
  },

  /**
   * Erros por campo. Se camposDoFormulario for informado ({ campoNaApi: idDoCampoNaTela }),
   * só retorna os campos que existem no formulário.
   */
  campos(error, camposDoFormulario = null) {
    const erros = Array.isArray(error?.body?.errors) ? error.body.errors : [];
    return erros
      .map((item) => ({
        field: camposDoFormulario ? camposDoFormulario[item.field] : item.field,
        message: item.message || 'Valor inválido.'
      }))
      .filter((item) => item.field);
  }
};
