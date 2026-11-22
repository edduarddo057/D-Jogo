import axe from 'axe-core';

/**
 * Auditoria automática de acessibilidade (axe-core) num trecho renderizado.
 * Contraste fica de fora: o jsdom não calcula estilos; ele é conferido por script nos tokens.
 */
export async function expectNoA11yViolations(container: Element): Promise<void> {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}×)`);
  expect(summary).toEqual([]);
}
