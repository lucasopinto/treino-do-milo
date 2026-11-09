import { describe, expect, it } from 'vitest'
import shared from '../../../shared/merge-cases.json'
import { pickNewer } from './merge'
import type { BaseRecord } from './types'

// Os mesmos casos rodam na API (api/tests/test_sync.py): app e servidor decidem igual.
describe('regra "o mais recente vence" (casos compartilhados com a API)', () => {
  for (const c of shared.cases) {
    it(c.name, () => {
      const cur = { id: 'x', createdAt: 0, deletedAt: null, ...c.current } as BaseRecord
      const inc = { id: 'x', createdAt: 0, deletedAt: null, ...c.incoming } as BaseRecord
      expect(pickNewer(cur, inc) === inc).toBe(c.winner === 'incoming')
    })
  }
})
