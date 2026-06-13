const { groupOntsByOlt } = require('../enrichmentService');

test('groupOntsByOlt agrupa por olt_id', () => {
  const onts = [
    { id: 'a', olt_id: 'o1' },
    { id: 'b', olt_id: 'o2' },
    { id: 'c', olt_id: 'o1' },
  ];
  const g = groupOntsByOlt(onts);
  expect([...g.keys()].sort()).toEqual(['o1', 'o2']);
  expect(g.get('o1').map((o) => o.id)).toEqual(['a', 'c']);
  expect(g.get('o2').map((o) => o.id)).toEqual(['b']);
});
