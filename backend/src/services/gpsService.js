const prisma = require('../config/database');

async function updateONTLocation(ontId, latitude, longitude) {
  return prisma.oNT.update({ where: { id: ontId }, data: { latitude, longitude } });
}

async function getONTLocation(ontId) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, select: { id: true, serial_number: true, latitude: true, longitude: true, description: true } });
  if (!ont) throw new Error('ONT not found');
  return ont;
}

async function getONTsWithLocation() {
  return prisma.oNT.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, serial_number: true, description: true, status: true, rx_power: true, latitude: true, longitude: true, client: { select: { name: true } } },
  });
}

async function updateNAPBoxLocation(napBoxId, latitude, longitude) {
  return prisma.nAPBox.update({ where: { id: napBoxId }, data: { latitude, longitude } });
}

module.exports = { updateONTLocation, getONTLocation, getONTsWithLocation, updateNAPBoxLocation };
