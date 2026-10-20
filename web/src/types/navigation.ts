/** Item de navegação descrito como dado (rótulo e destino); a apresentação fica nos componentes. */
export interface NavItem {
  href: string;
  label: string;
  /** Uma frase sobre o propósito da página. */
  description: string;
}
