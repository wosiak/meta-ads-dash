const accountId = 'UUID-DA-CONTA-QUE-VOCE-CRIOU-NO-PASSO-2'

fetch('http://localhost:3000/api/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accountId: accountId,
    dateStart: '2026-02-01',
    dateStop: '2026-02-21',
  }),
})
  .then(res => res.json())
  .then(data => console.log('Sync result:', data))
  .catch(err => console.error('Sync error:', err))
