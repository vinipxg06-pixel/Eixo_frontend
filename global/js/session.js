/**
 * Sessão do usuário no navegador.
 * O login devolve apenas o oficinaId, que é o único dado usado pelas telas.
 * (Dados do usuário e perfil/permissões ficam para quando a autenticação com token for implementada.)
 */
const Session = {
  saveLogin(data) {
    if (data.oficinaId != null) localStorage.setItem('oficinaId', data.oficinaId);
  },

  /**
   * Regra: telas internas só abrem com sessão ativa.
   * Sem sessão, redireciona para o login e retorna false para a tela interromper o carregamento.
   */
  exigirLogin() {
    if (this.getOficinaId()) return true;
    window.location.replace('../login/login.html');
    return false;
  },

  getOficinaId() {
    return localStorage.getItem('oficinaId');
  },

  clear() {
    localStorage.removeItem('oficinaId');
  }
};
