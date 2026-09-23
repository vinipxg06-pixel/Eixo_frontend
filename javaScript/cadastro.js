"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form =
        document.getElementById("cadastro-form");

    const nomeUsuarioInput =
        document.getElementById("nome-usuario");

    const emailInput =
        document.getElementById("email");

    const senhaInput =
        document.getElementById("senha");

    const confirmarSenhaInput =
        document.getElementById("confirmar-senha");

    const confirmarSenhaError =
        document.getElementById("confirmar-senha-error");

    const passwordButtons =
        document.querySelectorAll(".password-toggle");

    const cadastroButton =
        document.getElementById("cadastro-button");

    const systemMessage =
        document.getElementById("system-message");


    function mostrarMensagem(mensagem, tipo) {

        if (!systemMessage) {
            return;
        }

        systemMessage.textContent = mensagem;

        systemMessage.classList.remove(
            "success",
            "error"
        );

        if (tipo) {
            systemMessage.classList.add(tipo);
        }

    }


    function definirCarregando(carregando) {

        if (!cadastroButton) {
            return;
        }

        cadastroButton.disabled = carregando;

        const texto =
            cadastroButton.querySelector("span");

        if (texto) {
            texto.textContent = carregando
                ? "CRIANDO..."
                : "CRIAR CONTA";
        }

    }


    /* ================================================
       MOSTRAR / OCULTAR SENHAS
    ================================================ */

    passwordButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const targetId =
                button.dataset.passwordTarget;

            const input =
                document.getElementById(targetId);

            if (!input) {
                return;
            }

            const visivel =
                input.type === "text";

            input.type =
                visivel
                    ? "password"
                    : "text";

            button.setAttribute(
                "aria-pressed",
                String(!visivel)
            );

            button.setAttribute(
                "aria-label",
                visivel
                    ? "Mostrar senha"
                    : "Ocultar senha"
            );

        });

    });


    /* ================================================
       VALIDAR CONFIRMAÇÃO DE SENHA
    ================================================ */

    function validarSenhas() {

        if (
            !senhaInput ||
            !confirmarSenhaInput
        ) {
            return true;
        }

        const senha =
            senhaInput.value;

        const confirmacao =
            confirmarSenhaInput.value;

        const diferentes =
            confirmacao.length > 0 &&
            senha !== confirmacao;


        if (diferentes) {

            confirmarSenhaInput.setCustomValidity(
                "As senhas não coincidem."
            );

            confirmarSenhaInput.setAttribute(
                "aria-invalid",
                "true"
            );

            confirmarSenhaError.textContent =
                "As senhas não coincidem.";

            return false;
        }


        confirmarSenhaInput.setCustomValidity("");

        confirmarSenhaInput.removeAttribute(
            "aria-invalid"
        );

        confirmarSenhaError.textContent = "";

        return true;

    }


    senhaInput?.addEventListener(
        "input",
        validarSenhas
    );

    confirmarSenhaInput?.addEventListener(
        "input",
        validarSenhas
    );


    /* ================================================
       LIMPEZA DOS CAMPOS
    ================================================ */

    nomeUsuarioInput?.addEventListener(
        "blur",
        () => {

            nomeUsuarioInput.value =
                nomeUsuarioInput.value.trim();

        }
    );


    emailInput?.addEventListener(
        "blur",
        () => {

            emailInput.value =
                emailInput.value.trim().toLowerCase();

        }
    );


    /* ================================================
       SUBMIT
    ================================================ */

    form?.addEventListener("submit", async (event) => {

        event.preventDefault();

        mostrarMensagem("", null);

        nomeUsuarioInput.value =
            nomeUsuarioInput.value.trim();

        emailInput.value =
            emailInput.value.trim().toLowerCase();

        validarSenhas();

        if (!form.checkValidity()) {

            form.reportValidity();

            return;

        }


        if (!window.EixoApi) {

            mostrarMensagem(
                "A configuração da API não foi carregada.",
                "error"
            );

            return;

        }


        const endpoint =
            window.EixoApi.endpoints.cadastro();

        if (!endpoint) {

            mostrarMensagem(
                "O cadastro precisa ser vinculado a uma oficina. Esse fluxo ainda não foi configurado.",
                "error"
            );

            return;

        }


        definirCarregando(true);

        try {

            const {
                response,
                data
            } = await window.EixoApi.postJson(
                endpoint,
                {
                    nomeUsuario: nomeUsuarioInput.value,
                    email: emailInput.value,
                    senha: senhaInput.value
                }
            );


            if (!response.ok) {

                mostrarMensagem(
                    data?.message ||
                    "Não foi possível criar a conta.",
                    "error"
                );

                return;

            }


            form.reset();
            validarSenhas();

            mostrarMensagem(
                "Conta criada com sucesso. Você já pode entrar no sistema.",
                "success"
            );

        } catch (error) {

            console.error(
                "Falha de comunicação com a API:",
                error
            );

            mostrarMensagem(
                "Não foi possível conectar ao servidor. Verifique se ele está em execução.",
                "error"
            );

        } finally {

            definirCarregando(false);

        }

    });

});
