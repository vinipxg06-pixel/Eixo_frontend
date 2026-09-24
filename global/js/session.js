const Session = {
  saveLogin(data) {
    if (data.usuarioId != null) localStorage.setItem('usuarioId', data.usuarioId);
    if (data.oficinaId != null) localStorage.setItem('oficinaId', data.oficinaId);
    if (data.nome != null) localStorage.setItem('usuarioNome', data.nome);
    if (data.perfil != null) localStorage.setItem('usuarioPerfil', data.perfil);
  },

  getUsuarioId() {
    return localStorage.getItem('usuarioId');
  },

  getOficinaId() {
    return localStorage.getItem('oficinaId');
  },

  getUsuarioNome() {
    return localStorage.getItem('usuarioNome');
  },

  getUsuarioPerfil() {
    return localStorage.getItem('usuarioPerfil');
  },

  clear() {
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('oficinaId');
    localStorage.removeItem('usuarioNome');
    localStorage.removeItem('usuarioPerfil');
  }
};
