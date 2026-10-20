/** Testes unitários do registro em memória de mensagens enviadas pelo sistema (sem banco). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../src/services/sentMessageRegistry');

describe('sentMessageRegistry', () => {
  it('reconhece IDs registrados e ignora valores vazios', () => {
    registry.registerSentMessageId('ABC123');
    assert.equal(registry.isRegisteredSentId('ABC123'), true);
    assert.equal(registry.isRegisteredSentId('OUTRO'), false);
    registry.registerSentMessageId(null);
    registry.registerSentMessageId('');
    assert.equal(registry.isRegisteredSentId(''), false);
    assert.equal(registry.isRegisteredSentId(undefined), false);
  });

  it('IDs expiram depois de 30 minutos', () => {
    const t0 = 1_000_000;
    registry.registerSentMessageId('VELHO', t0);
    assert.equal(registry.isRegisteredSentId('VELHO', t0 + 29 * 60 * 1000), true);
    assert.equal(registry.isRegisteredSentId('VELHO', t0 + 31 * 60 * 1000), false);
  });

  it('texto idêntico ao mesmo número vale só por 2 minutos', () => {
    const t0 = Date.now();
    registry.registerSentText('5511999990000', '  Olá! Tudo bem?  ', t0);
    assert.equal(registry.wasTextRecentlySent('5511999990000', 'Olá! Tudo bem?', t0 + 1000), true);
    // Mesmo destino escrito como JID.
    assert.equal(registry.wasTextRecentlySent('5511999990000@s.whatsapp.net', 'Olá! Tudo bem?', t0 + 1000), true);
    // Outro número ou outro texto: não.
    assert.equal(registry.wasTextRecentlySent('5511999990001', 'Olá! Tudo bem?', t0 + 1000), false);
    assert.equal(registry.wasTextRecentlySent('5511999990000', 'Olá!', t0 + 1000), false);
    // Depois da janela de 2 minutos: não.
    assert.equal(registry.wasTextRecentlySent('5511999990000', 'Olá! Tudo bem?', t0 + registry.TEXT_WINDOW_MS + 1), false);
  });
});
