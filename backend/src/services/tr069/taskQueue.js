const tasks = new Map();

function enqueue(deviceId, task) {
  if (!tasks.has(deviceId)) tasks.set(deviceId, []);
  tasks.get(deviceId).push({ ...task, id: Date.now(), status: 'pending' });
  return tasks.get(deviceId).slice(-1)[0];
}

function dequeue(deviceId) {
  const q = tasks.get(deviceId) || [];
  return q.shift() || null;
}

function getQueue(deviceId) {
  return tasks.get(deviceId) || [];
}

module.exports = { enqueue, dequeue, getQueue };
