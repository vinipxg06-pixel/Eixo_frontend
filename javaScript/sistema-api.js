"use strict";

/*
 * Camada de dados da área interna. Só consome rotas existentes no backend.
 * Ordem de serviço, caixa e dados financeiros aguardam APIs próprias.
 */
document.addEventListener("DOMContentLoaded", () => {
    const oficinaId = window.sessionStorage.getItem("eixo.oficinaId");

    if (!oficinaId) {
        window.location.replace("login.html");
        return;
    }

    const api = window.EixoApi;
    const estado = { clientes: [], veiculos: [], orcamentos: [], estoque: [] };
    const toast = document.querySelector("[data-toast]");

    function mostrarToast(texto) {
        if (!toast) return;
        toast.textContent = texto;
        toast.classList.add("show");
        window.setTimeout(() => toast.classList.remove("show"), 3500);
    }

    function escapar(valor) {
        return String(valor ?? "—")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }

    async function buscar(caminho) {
        const { response, data } = await api.requisitarJson(api.criarUrl(caminho));

        if (!response.ok) {
            throw new Error(data?.message || "Não foi possível carregar os dados.");
        }

        return data;
    }

    function status(valor) {
        const texto = String(valor ?? "—").toLowerCase();
        const classe = texto.includes("ativo") || texto.includes("aprov") || texto === "ok"
            ? "active"
            : texto.includes("baixo") || texto.includes("pend")
                ? "low"
                : "inactive";

        return `<span class="status ${classe}">${escapar(texto)}</span>`;
    }

    function semApi(chave, mensagem) {
        const corpo = document.querySelector(`[data-list="${chave}"]`);
        if (corpo) {
            corpo.innerHTML = `<tr><td colspan="12" class="empty-state">${escapar(mensagem)}</td></tr>`;
        }
    }

    function renderClientes(lista = estado.clientes) {
        const alvo = document.querySelector('[data-list="clientes"]');
        if (!alvo) return;

        alvo.innerHTML = lista.map((cliente) => {
            const iniciais = String(cliente.nomeCliente || "—")
                .split(" ").slice(0, 2).map((parte) => parte[0]).join("");

            return `<article class="client-row">
                <span class="avatar">${escapar(iniciais)}</span>
                <div class="client-main"><b>${escapar(cliente.nomeCliente)}</b><p>${escapar(cliente.telefone)} · ${escapar(cliente.email || "sem e-mail")}</p></div>
                ${status(cliente.status)}
            </article>`;
        }).join("") || '<p class="empty-state">Nenhum cliente cadastrado.</p>';

        const contador = document.querySelector('[data-count="clientes"]');
        if (contador) contador.textContent = lista.length;
    }

    function renderVeiculos(lista = estado.veiculos) {
        const alvo = document.querySelector('[data-list="veiculos"]');
        if (!alvo) return;

        alvo.innerHTML = lista.map((veiculo) => {
            const modelo = veiculo.Modelo || veiculo.modelo;
            const marca = modelo?.marca?.nomeMarca || modelo?.marca || "—";
            const nomeModelo = modelo?.nomeModelo || modelo?.modelo || "—";

            return `<tr><td><strong class="id">${escapar(veiculo.placa)}</strong></td><td>${escapar(marca)}</td><td>${escapar(nomeModelo)}</td><td>${escapar(veiculo.ano)}</td><td>${escapar(veiculo.cor)}</td><td>${escapar(veiculo.combustivel)}</td><td>${escapar(veiculo.quilometragem)} km</td><td>${escapar(veiculo.nomeCliente)}</td><td>—</td><td></td></tr>`;
        }).join("") || '<tr><td colspan="10" class="empty-state">Nenhum veículo cadastrado.</td></tr>';

        const contador = document.querySelector('[data-count="veiculos"]');
        if (contador) contador.textContent = lista.length;
    }

    function renderOrcamentos(lista = estado.orcamentos) {
        const alvo = document.querySelector('[data-list="orcamentos"]');
        if (!alvo) return;
        const clientes = new Map(estado.clientes.map((cliente) => [cliente.clienteId, cliente.nomeCliente]));
        const veiculos = new Map(estado.veiculos.map((veiculo) => [veiculo.idVeiculo, veiculo]));

        alvo.innerHTML = lista.map((orcamento) => {
            const veiculo = veiculos.get(orcamento.veiculoId);
            const veiculoTexto = veiculo ? `${veiculo.placa} · ${veiculo.ano}` : "—";
            const valor = Number(orcamento.valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            return `<tr><td><strong class="id">ORC-${escapar(orcamento.orcamentoId)}</strong></td><td>${escapar(clientes.get(orcamento.clienteId))}</td><td>${escapar(veiculoTexto)}</td><td>—</td><td>${valor}</td><td>${status(orcamento.status)}</td><td></td></tr>`;
        }).join("") || '<tr><td colspan="7" class="empty-state">Nenhum orçamento cadastrado.</td></tr>';

        const contador = document.querySelector('[data-count="orcamentos"]');
        if (contador) contador.textContent = lista.length;
    }

    function renderEstoque(lista = estado.estoque) {
        const alvo = document.querySelector('[data-list="estoque"]');
        if (!alvo) return;

        alvo.innerHTML = lista.map((peca) => {
            const quantidade = Number(peca.quantidade || 0);
            const minimo = Number(peca.estoqueMinimo || 0);
            const baixo = quantidade <= minimo;
            const preco = Number(peca.precoUnitario || 0);
            const total = quantidade * preco;
            const dinheiro = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            return `<tr><td>${escapar(peca.codigoBarras || `IT-${peca.estoqueId}`)}</td><td>${escapar(peca.nomePeca)}</td><td><span class="category">${escapar(peca.categoria)}</span></td><td>${escapar(peca.unidadeMedida)}</td><td>${escapar(peca.quantidade)}</td><td>${escapar(peca.estoqueMinimo)}</td><td>${dinheiro(preco)}</td><td>${dinheiro(total)}</td><td>${status(baixo ? "baixo" : "ok")}</td><td></td></tr>`;
        }).join("") || '<tr><td colspan="10" class="empty-state">Nenhum item cadastrado.</td></tr>';

        const contador = document.querySelector('[data-count="estoque"]');
        if (contador) contador.textContent = lista.length;
    }

    function atualizarDashboard() {
        const metricas = document.querySelectorAll(".summary-grid .metric");
        const estoqueBaixo = estado.estoque.filter((peca) => Number(peca.quantidade || 0) <= Number(peca.estoqueMinimo || 0)).length;
        const totalOrcamentos = estado.orcamentos.reduce((total, item) => total + Number(item.valorTotal || 0), 0);

        if (metricas[0]) metricas[0].querySelector("b").textContent = totalOrcamentos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        if (metricas[1]) { metricas[1].querySelector("small").textContent = "Orçamentos cadastrados"; metricas[1].querySelector("b").textContent = estado.orcamentos.length; }
        if (metricas[2]) metricas[2].querySelector("b").textContent = estado.clientes.length;
        if (metricas[3]) metricas[3].querySelector("b").textContent = estoqueBaixo;
        document.querySelectorAll(".revenue-chart header p, .service-chart header p, .production header p").forEach((elemento) => elemento.textContent = "Aguardando API financeira e de ordens de serviço");
    }

    async function carregarDados() {
        try {
            const [oficina, clientes, veiculos, orcamentos, estoque] = await Promise.all([
                buscar(`/oficinas/${encodeURIComponent(oficinaId)}`),
                buscar(`/oficinas/${encodeURIComponent(oficinaId)}/clientes`),
                buscar(`/oficinas/${encodeURIComponent(oficinaId)}/veiculos`),
                buscar(`/oficinas/${encodeURIComponent(oficinaId)}/orcamentos`),
                buscar(`/oficinas/${encodeURIComponent(oficinaId)}/pecas`)
            ]);

            estado.clientes = Array.isArray(clientes) ? clientes : [];
            estado.veiculos = Array.isArray(veiculos) ? veiculos : [];
            estado.orcamentos = Array.isArray(orcamentos) ? orcamentos : [];
            estado.estoque = Array.isArray(estoque) ? estoque : [];

            document.querySelector(".brand").setAttribute("aria-label", oficina.nomeOficina || "EIXO");
            renderClientes();
            renderVeiculos();
            renderOrcamentos();
            renderEstoque();
            atualizarDashboard();
            semApi("ordens", "Ordens de serviço aguardam uma API no backend.");
            semApi("caixa", "Fluxo de caixa aguarda uma API no backend.");
        } catch (erro) {
            mostrarToast("Não foi possível carregar os dados da oficina. Verifique o servidor e o CORS.");
            ["clientes", "veiculos", "orcamentos", "estoque"].forEach((chave) => semApi(chave, "Dados indisponíveis no momento."));
        }
    }

    document.addEventListener("input", (evento) => {
        const campo = evento.target.closest("[data-search]");
        if (!campo) return;
        evento.stopImmediatePropagation();
        const termo = campo.value.toLowerCase();
        const chave = campo.dataset.search;
        const lista = estado[chave].filter((item) => JSON.stringify(item).toLowerCase().includes(termo));
        chave === "clientes" ? renderClientes(lista) : chave === "veiculos" ? renderVeiculos(lista) : renderEstoque(lista);
    }, true);

    document.querySelectorAll("[data-new]").forEach((botao) => {
        botao.addEventListener("click", () => {
            mostrarToast("O formulário desta operação será conectado ao endpoint correspondente na próxima etapa.");
        }, true);
    });

    carregarDados();
});
