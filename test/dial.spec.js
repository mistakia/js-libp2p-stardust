'use strict'

const Client = require('../src/client')
const ID = require('peer-id')
const IDJSON = [require('./id.json'), require('./id2.json')]
const multiaddr = require('multiaddr')
const SERVER_URL = multiaddr('/ip4/127.0.0.1/tcp/5892/ws')
const pull = require('pull-stream/pull')
const prom = (f) => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res)))

describe('dial', () => {
  let clients = []
  let conns = []
  let ids

  before(async () => {
    ids = await Promise.all(IDJSON.map(id => new Promise((resolve, reject) =>
      ID.createFromJSON(id, (err, id) => err ? reject(err) : resolve(id))
    )))
  })

  it('connect all clients', async () => {
    clients = ids.map(id => new Client({id}))
    conns = clients.map(client => client.createConnection(conn => pull(conn, conn)))
    await Promise.all(conns.map(conn => conn.connect(SERVER_URL)))
    clients.forEach(c => (c.addr = multiaddr('/ipfs/' + c.id.toB58String())))
  })

  it('client1 should dial client2 over server1 and echo back', async () => {
    const conn = await conns[0].dial(clients[1].addr)
    const res = await prom(cb =>
      pull(
        pull.values(['hello']),
        conn,
        pull.collect(cb)
      )
    )
    require('assert')(String(res[0]) === 'hello')
  })
})