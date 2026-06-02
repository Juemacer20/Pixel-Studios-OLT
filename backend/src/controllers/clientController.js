const prisma = require('../config/database');

async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { contract_number: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.client.findMany({ where, include: { ont: { include: { olt: { select: { name: true } } } } }, skip, take: parseInt(limit), orderBy: { name: 'asc' } }),
      prisma.client.count({ where }),
    ]);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { ont: { include: { olt: true, signalHistory: { orderBy: { timestamp: 'desc' }, take: 100 } } }, tr069Devices: true },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ data: client });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.status(201).json({ data: client });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: client });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
