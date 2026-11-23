/**
 * Regra de precificação de peças em orçamentos e ordens de serviço (espelha o backend).
 *
 * Cada unidade vale o preço vigente da peça no momento em que foi adicionada.
 * Ao aumentar a quantidade de uma linha já salva cujo preço gravado é diferente do preço atual,
 * as unidades novas são cobradas pelo preço atual — o backend as grava em outra linha.
 * Ex.: 1 pneu a R$ 10 (já salvo) + 1 pneu adicionado com o preço em R$ 12 = R$ 22.
 *
 * Uma linha é { valor, quantidade, quantidadeOriginal }:
 * - valor: preço unitário gravado na linha;
 * - quantidadeOriginal: quantidade já salva (null para linhas novas).
 */
const PrecificacaoPecas = {
  precoMudou(linha, precoAtual) {
    return Number.isFinite(Number(precoAtual)) && Number(precoAtual) !== Number(linha.valor);
  },

  unidadesNovasComPrecoAtual(linha, precoAtual) {
    if (linha.quantidadeOriginal == null || !this.precoMudou(linha, precoAtual)) return 0;
    return Math.max(Number(linha.quantidade || 0) - Number(linha.quantidadeOriginal), 0);
  },

  subtotal(linha, precoAtual) {
    const quantidade = Number(linha.quantidade || 0);
    const valor = Number(linha.valor || 0);
    const novas = this.unidadesNovasComPrecoAtual(linha, precoAtual);
    return (quantidade - novas) * valor + novas * Number(precoAtual || 0);
  },

  /** Textos para exibir o preço unitário da linha e avisar quando o preço atual é diferente. */
  descricao(linha, precoAtual) {
    const novas = this.unidadesNovasComPrecoAtual(linha, precoAtual);
    const quantidadeBase = Number(linha.quantidade || 0) - novas;
    const base = `${this.formatarQuantidade(quantidadeBase)} × ${Formatters.formatCurrencyBRL(Number(linha.valor || 0))}`;

    if (novas > 0) {
      return { base, destaque: `+ ${this.formatarQuantidade(novas)} × ${Formatters.formatCurrencyBRL(Number(precoAtual))} (preço atual)` };
    }
    if (linha.quantidadeOriginal != null && this.precoMudou(linha, precoAtual)) {
      return { base, destaque: `Preço atual: ${Formatters.formatCurrencyBRL(Number(precoAtual))}` };
    }
    return { base, destaque: null };
  },

  formatarQuantidade(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
};
