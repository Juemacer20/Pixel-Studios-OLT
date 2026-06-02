const prisma = require('../../config/database');

async function getDevices(filters = {}) {
  return prisma.tR069Device.findMany({ include: { ont: true, client: true }, take: 100 });
}
async function getDevice(id) {
  return prisma.tR069Device.findUnique({ where: { id }, include: { ont: true, client: true } });
}
async function updateDevice(id, data) {
  return prisma.tR069Device.update({ where: { id }, data });
}
module.exports = { getDevices, getDevice, updateDevice };
