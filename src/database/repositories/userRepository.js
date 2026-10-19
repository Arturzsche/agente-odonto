const prisma = require('../prisma');

/** Cria o paciente na primeira mensagem; nas seguintes, só atualiza nome/telefone se mudaram. */
async function upsertUser({ remoteJid, phone, name }) {
  const cleanName = name?.trim() || undefined;
  return prisma.user.upsert({
    where: { remoteJid },
    create: { remoteJid, phone, name: cleanName },
    update: { phone, ...(cleanName && { name: cleanName }) },
  });
}

module.exports = { upsertUser };
