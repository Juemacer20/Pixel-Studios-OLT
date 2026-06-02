const prisma = require('../../config/database');

async function getProfiles() {
  return prisma.zTPProfile.findMany({ include: { serviceProfile: true } });
}
async function createProfile(data) {
  return prisma.zTPProfile.create({ data });
}
async function updateProfile(id, data) {
  return prisma.zTPProfile.update({ where: { id }, data });
}
async function deleteProfile(id) {
  return prisma.zTPProfile.delete({ where: { id } });
}
module.exports = { getProfiles, createProfile, updateProfile, deleteProfile };
