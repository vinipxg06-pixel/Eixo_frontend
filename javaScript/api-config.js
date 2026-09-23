"use strict";

/* Configuracao central das chamadas HTTP do EIXO. */
(function configurarApiEixo() {
    const pagina = document.documentElement;

    function normalizarBaseUrl(valor) {
        return valor.replace(/\/$/, "");
    }

    function obterBaseUrl() {
        const configurada = pagina.dataset.apiBaseUrl?.trim();

        if (configurada) {
            return normalizarBaseUrl(configurada);
        }

        const emHostLocal =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

        if (emHostLocal && window.location.port !== "8082") {
            return "http://localhost:8082";
        }

        return "";
    }

    function criarUrl(caminho) {
        return `${obterBaseUrl()}${caminho}`;
    }

    async function lerCorpo(response) {
        const texto = await response.text();

        if (!texto) {
            return null;
        }

        try {
            return JSON.parse(texto);
        } catch {
            return { message: texto };
        }
    }

    async function postJson(endpoint, dados) {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            /* Preparado para sessao/cookie HttpOnly quando o backend oferecer. */
            credentials: "include",
            body: JSON.stringify(dados)
        });

        return {
            response,
            data: await lerCorpo(response)
        };
    }

    async function requisitarJson(endpoint, opcoes = {}) {
        const response = await fetch(endpoint, {
            headers: {
                "Accept": "application/json",
                ...opcoes.headers
            },
            credentials: "include",
            ...opcoes
        });

        return {
            response,
            data: await lerCorpo(response)
        };
    }

    function obterIdOficinaCadastro() {
        return pagina.dataset.registrationOfficeId?.trim() || null;
    }

    function obterEndpointRecuperacao() {
        const caminho = pagina.dataset.passwordRecoveryPath?.trim();

        return caminho ? criarUrl(caminho) : null;
    }

    window.EixoApi = Object.freeze({
        endpoints: Object.freeze({
            login: () => criarUrl("/usuarios/login"),
            cadastro: () => {
                const oficinaId = obterIdOficinaCadastro();

                return oficinaId
                    ? criarUrl(`/usuarios/oficinaUsuarios/${encodeURIComponent(oficinaId)}`)
                    : null;
            },
            recuperacaoSenha: obterEndpointRecuperacao
        }),
        criarUrl,
        postJson,
        requisitarJson
    });
})();
