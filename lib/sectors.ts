/** Rubros de FMP traducidos al castellano. */
const ES: Record<string, string> = {
  Technology: 'Tecnología', 'Financial Services': 'Finanzas', Energy: 'Energía', Healthcare: 'Salud',
  'Consumer Cyclical': 'Consumo', 'Consumer Defensive': 'Consumo básico', Industrials: 'Industria', 'Basic Materials': 'Materiales',
  'Communication Services': 'Comunicación', Utilities: 'Servicios públicos', 'Real Estate': 'Inmobiliario'
};
export const SECTORS = Object.entries(ES).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
export const sectorEs = (s?: string | null) => (s ? ES[s] ?? (s === 'Financial' ? 'Finanzas' : s) : 'Sin rubro');

export const RISK_LEVELS = ['Bajo', 'Medio', 'Alto', 'Muy alto'] as const;
/** Riesgo según el beta (cuánto se mueve la acción comparada con el mercado). La cripto siempre es muy alto. */
export function riskLevel(beta: number | null | undefined, crypto: boolean) {
  if (crypto) return 'Muy alto';
  if (beta == null || !isFinite(beta)) return 'Medio';
  return beta < 0.8 ? 'Bajo' : beta < 1.2 ? 'Medio' : beta < 1.6 ? 'Alto' : 'Muy alto';
}
