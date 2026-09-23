"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* ==================================================
       ELEMENTOS
    ================================================== */

    const form =
        document.getElementById("login-form");

    const emailInput =
        document.getElementById("email");

    const senhaInput =
        document.getElementById("senha");

    const passwordToggle =
        document.getElementById("password-toggle");

    const loginButton =
        document.getElementById("login-button");

    const systemMessage =
        document.getElementById("system-message");


    /* ==================================================
       CONFIGURAÇÃO DA API
    ================================================== */

    const LOGIN_ENDPOINT =
        window.EixoApi?.endpoints.login();


    /* ==================================================
       MOSTRAR / OCULTAR SENHA
    ================================================== */

    if (
        senhaInput &&
        passwordToggle
    ) {

        passwordToggle.addEventListener(
            "click",
            () => {

                const senhaVisivel =
                    senhaInput.type === "text";

                senhaInput.type =
                    senhaVisivel
                        ? "password"
                        : "text";

                passwordToggle.setAttribute(
                    "aria-pressed",
                    String(!senhaVisivel)
                );

                passwordToggle.setAttribute(
                    "aria-label",
                    senhaVisivel
                        ? "Mostrar senha"
                        : "Ocultar senha"
                );

            }
        );

    }


    /* ==================================================
       NORMALIZAR E-MAIL
    ================================================== */

    emailInput?.addEventListener(
        "blur",
        () => {

            emailInput.value =
                normalizarEmail(
                    emailInput.value
                );

        }
    );


    function normalizarEmail(email) {

        return email
            .trim()
            .toLowerCase();

    }


    /* ==================================================
       MENSAGENS
    ================================================== */

    function limparMensagem() {

        if (!systemMessage) {
            return;
        }

        systemMessage.textContent = "";

        systemMessage.classList.remove(
            "success",
            "error"
        );

    }


    function mostrarMensagem(
        mensagem,
        tipo
    ) {

        if (!systemMessage) {
            return;
        }

        systemMessage.textContent =
            mensagem;

        systemMessage.classList.remove(
            "success",
            "error"
        );

        systemMessage.classList.add(tipo);

    }


    /* ==================================================
       ESTADO DE CARREGAMENTO
    ================================================== */

    function definirCarregando(
        carregando
    ) {

        if (!loginButton) {
            return;
        }

        loginButton.disabled =
            carregando;

        const texto =
            loginButton.querySelector("span");

        if (!texto) {
            return;
        }

        texto.textContent =
            carregando
                ? "ENTRANDO..."
                : "ENTRAR NO SISTEMA";

    }


    /* ==================================================
       SUBMIT
    ================================================== */

    form?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            limparMensagem();

            if (!LOGIN_ENDPOINT || !window.EixoApi) {

                mostrarMensagem(
                    "A configuração da API não foi carregada.",
                    "error"
                );

                return;
            }


            emailInput.value =
                normalizarEmail(
                    emailInput.value
                );


            /*
             * Validação HTML antes da chamada à API.
             */
            if (!form.checkValidity()) {

                form.reportValidity();

                return;

            }


            const loginRequest = {

                email:
                    emailInput.value,

                senha:
                    senhaInput.value

            };


            definirCarregando(true);


            try {

                const {
                    response,
                    data
                } = await window.EixoApi.postJson(
                    LOGIN_ENDPOINT,
                    loginRequest
                );


                /* ====================================
                   CREDENCIAIS INVÁLIDAS
                ==================================== */

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    mostrarMensagem(
                        "E-mail ou senha inválidos.",
                        "error"
                    );

                    return;

                }


                /* ====================================
                   OUTROS ERROS
                ==================================== */

                if (!response.ok) {

                    mostrarMensagem(
                        data?.message ||
                        "Não foi possível realizar o login.",
                        "error"
                    );

                    return;

                }


                /* ====================================
                   LOGIN REALIZADO
                ==================================== */

                if (data?.oficinaId == null) {

                    mostrarMensagem(
                        "A resposta do servidor está incompleta.",
                        "error"
                    );

                    return;

                }


                /*
                 * O ID identifica a oficina ativa somente nesta aba. Ele não
                 * é uma credencial e nunca é colocado na URL.
                 */
                window.sessionStorage.setItem(
                    "eixo.oficinaId",
                    String(data.oficinaId)
                );

                mostrarMensagem(
                    "Dados de acesso validados com sucesso.",
                    "success"
                );

                window.setTimeout(
                    () => {
                        window.location.href = "sistema.html";
                    },
                    350
                );
            } catch (error) {

                console.error(
                    "Falha de comunicação com a API:",
                    error
                );


                mostrarMensagem(
                    "Não foi possível conectar ao servidor. Verifique se o Spring Boot está em execução.",
                    "error"
                );

            } finally {

                definirCarregando(false);

            }

        }
    );

});
