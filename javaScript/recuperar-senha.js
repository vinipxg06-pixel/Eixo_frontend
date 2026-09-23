"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const form =
        document.getElementById("recovery-form");

    const emailInput =
        document.getElementById("email");

    const emailError =
        document.getElementById("email-error");

    const recoveryButton =
        document.getElementById("recovery-button");

    const systemMessage =
        document.getElementById("system-message");


    const RECOVERY_ENDPOINT =
        window.EixoApi?.endpoints.recuperacaoSenha();


    /* ================================================
       LIMPAR MENSAGENS
    ================================================ */

    function limparMensagens() {

        emailError.textContent = "";

        emailInput.removeAttribute(
            "aria-invalid"
        );

        systemMessage.textContent = "";

        systemMessage.classList.remove(
            "success",
            "error"
        );

    }


    /* ================================================
       VALIDAR E-MAIL
    ================================================ */

    function validarEmail() {

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        emailInput.value = email;


        if (!email) {

            emailInput.setAttribute(
                "aria-invalid",
                "true"
            );

            emailError.textContent =
                "Informe seu e-mail.";

            return false;

        }


        if (!emailInput.validity.valid) {

            emailInput.setAttribute(
                "aria-invalid",
                "true"
            );

            emailError.textContent =
                "Informe um e-mail válido.";

            return false;

        }


        emailInput.removeAttribute(
            "aria-invalid"
        );

        emailError.textContent = "";

        return true;

    }


    /* ================================================
       ESTADO DO BOTÃO
    ================================================ */

    function definirCarregando(carregando) {

        recoveryButton.disabled =
            carregando;

        const texto =
            recoveryButton.querySelector("span");

        if (!texto) {
            return;
        }

        texto.textContent =
            carregando
                ? "ENVIANDO..."
                : "ENVIAR INSTRUÇÕES";

    }


    if (!RECOVERY_ENDPOINT || !window.EixoApi) {

        recoveryButton.disabled = true;

        systemMessage.textContent =
            "A recuperação de senha ainda não está disponível.";

        systemMessage.classList.add("error");

        return;
    }


    /* ================================================
       CAMPO E-MAIL
    ================================================ */

    emailInput.addEventListener(
        "input",
        () => {

            if (
                emailInput.hasAttribute(
                    "aria-invalid"
                )
            ) {
                validarEmail();
            }

        }
    );


    emailInput.addEventListener(
        "blur",
        () => {

            emailInput.value =
                emailInput.value
                    .trim()
                    .toLowerCase();

        }
    );


    /* ================================================
       SUBMIT
    ================================================ */

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            limparMensagens();


            if (!validarEmail()) {
                return;
            }


            const email =
                emailInput.value;


            definirCarregando(true);


            try {

                const { response } =
                    await window.EixoApi.postJson(
                        RECOVERY_ENDPOINT,
                        { email }
                    );


                /*
                 * Por segurança, a interface não deve
                 * informar se o e-mail existe ou não.
                 *
                 * Isso evita enumeração de usuários.
                 */

                if (response.ok) {

                    systemMessage.textContent =
                        "Se existir uma conta associada a este e-mail, enviaremos as instruções para redefinir sua senha.";

                    systemMessage.classList.add(
                        "success"
                    );

                    emailInput.value = "";

                    return;

                }


                throw new Error(
                    "Falha na solicitação."
                );

            } catch (error) {

                console.error(
                    "Erro ao solicitar recuperação:",
                    error
                );

                systemMessage.textContent =
                    "Não foi possível processar a solicitação agora. Tente novamente mais tarde.";

                systemMessage.classList.add(
                    "error"
                );

            } finally {

                definirCarregando(false);

            }

        }
    );

});
