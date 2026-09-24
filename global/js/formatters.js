/**
 * Formatadores globais do EIXO.
 *
 * Regra do projeto:
 * - A interface pode exibir valores formatados para facilitar a leitura.
 * - A API continua recebendo os valores crus esperados pelo backend.
 */
const Formatters = {
  onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  },

  formatCpfCnpj(value) {
    const digits = this.onlyDigits(value).slice(0, 14);

    if (digits.length <= 11) {
      return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }

    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\/\d{4})(\d)/, '$1-$2');
  },

  formatPhone(value) {
    const digits = this.onlyDigits(value).slice(0, 11);

    if (!digits) return '';

    if (digits.length <= 2) {
      return `(${digits}`;
    }

    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  },

  formatCurrencyBRL(value) {
    if (value === null || value === undefined || value === '') return '';

    const number = typeof value === 'number'
      ? value
      : Number(String(value).replace(',', '.'));

    if (!Number.isFinite(number)) return '';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  },

  /**
   * Útil para inputs monetários em que o usuário digita centavos sem separador.
   * Ex.: "123456" -> "R$ 1.234,56".
   */
  formatCurrencyInput(value) {
    const digits = this.onlyDigits(value);
    if (!digits) return '';

    return this.formatCurrencyBRL(Number(digits) / 100);
  },

  /**
   * Converte uma string monetária exibida no padrão brasileiro em Number.
   * Ex.: "R$ 1.234,56" -> 1234.56.
   */
  currencyToNumber(value) {
    if (typeof value === 'number') return value;

    const normalized = String(value ?? '')
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }
};
