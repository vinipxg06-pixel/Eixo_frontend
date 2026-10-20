const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const toggleSenhaButton = document.getElementById('toggle-senha');
const entrarButton = document.getElementById('btn-entrar');
const entrarButtonText = entrarButton.querySelector('.btn-text');

function setLoading(isLoading) {
  entrarButton.disabled = isLoading;
  entrarButtonText.textContent = isLoading ? 'Entrando...' : 'Entrar no Sistema';
}

function toggleSenha() {
  const senhaVisivel = senhaInput.type === 'text';

  senhaInput.type = senhaVisivel ? 'password' : 'text';
  toggleSenhaButton.setAttribute('aria-label', senhaVisivel ? 'Mostrar senha' : 'Ocultar senha');
  toggleSenhaButton.setAttribute('title', senhaVisivel ? 'Mostrar senha' : 'Ocultar senha');
}

toggleSenhaButton.addEventListener('click', toggleSenha);

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    showToast('Informe o email e a senha para continuar.', 'warning');
    return;
  }

  setLoading(true);

  try {
    const dados = await apiRequest('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });

    Session.saveLogin(dados);

    showToast('Login realizado com sucesso!', 'success');

    setTimeout(() => {
      window.location.href = '../dashboard/dashboard.html';
    }, 500);

  } catch (erro) {
    console.error('Erro ao realizar login:', erro);

    if (erro.status === 404) {
      showToast('Email ou senha inválidos.', 'error');
      return;
    }

    if (erro.status === 400 || erro.status === 401 || erro.status === 403) {
      showToast(erro.body?.message || 'Email ou senha inválidos.', 'error');
      return;
    }

    showToast('Não foi possível conectar ao servidor.', 'error');

  } finally {
    setLoading(false);
  }
});
