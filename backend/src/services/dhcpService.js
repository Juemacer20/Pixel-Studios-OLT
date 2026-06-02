const prisma = require('../config/database');

async function getLeasesForONT(ontId) {
  return prisma.dHCPLease.findMany({ where: { ont_id: ontId }, orderBy: { created_at: 'desc' } });
}

async function addLease(data) {
  return prisma.dHCPLease.create({ data });
}

async function removeLease(id) {
  return prisma.dHCPLease.delete({ where: { id } });
}

module.exports = { getLeasesForONT, addLease, removeLease };
