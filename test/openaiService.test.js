/** Testes unitários das proteções de texto do openaiService (sem banco nem rede). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Silencia os logs de inicialização dos serviços.
const logger = require('../src/utils/logger');
if (process.env.TEST_VERBOSE !== '1') logger.info = logger.warn = logger.error = () => {};

const { isStall, promisesTeamFollowUp } = require('../src/services/openaiService');

describe('openaiService: proteções de texto', () => {
  it('mensagens de espera continuam sendo detectadas; encaminhar para a equipe não é espera', () => {
    assert.equal(isStall('Um momento, vou verificar a agenda.'), true);
    assert.equal(isStall('Já sinalizei a equipe, e alguém vai continuar seu atendimento por aqui.'), false);
  });

  it('reconhece promessa de retorno da equipe (rede de segurança do encaminhamento)', () => {
    assert.equal(promisesTeamFollowUp('Vou confirmar com a equipe e alguém te responde.'), true);
    assert.equal(promisesTeamFollowUp('A equipe vai te responder por aqui, tá bom?'), true);
    assert.equal(promisesTeamFollowUp('A avaliação custa R$ 150,00. Quer agendar?'), false);
    assert.equal(promisesTeamFollowUp(''), false);
  });
});
