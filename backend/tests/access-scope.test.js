const {
  getUserId,
  buildCaseScope,
  buildDocumentListScope,
  userCanAccessCase,
  sanitizeCaseForClient,
  resolveClientForUser
} = require('../src/lib/accessScope');

describe('accessScope helpers', () => {
  test('getUserId prefers userId from JWT payload', () => {
    expect(getUserId({ userId: 'user-1', id: 'legacy' })).toBe('user-1');
    expect(getUserId({ user: { userId: 'user-2' } })).toBe('user-2');
  });

  test('buildCaseScope grants full access to super admins', async () => {
    const scope = await buildCaseScope({ user: { role: 'SUPER_ADMIN', userId: 'a1' } });
    expect(scope).toEqual({});
  });

  test('buildCaseScope scopes attorneys to assigned cases', async () => {
    const scope = await buildCaseScope({ user: { role: 'ATTORNEY', userId: 'atty-1' } });
    expect(scope.OR).toEqual(
      expect.arrayContaining([
        { attorneyId: 'atty-1' },
        { secondAttorneyId: 'atty-1' },
        { referringAttorneyId: 'atty-1' }
      ])
    );
  });

  test('buildDocumentListScope blocks unknown roles', async () => {
    const scope = await buildDocumentListScope({ user: { role: 'STAFF', userId: 's1' } });
    expect(scope.OR).toBeDefined();
  });

  test('sanitizeCaseForClient removes internal billing fields', () => {
    const sanitized = sanitizeCaseForClient({
      id: 'case-1',
      title: 'Test',
      internalNotes: 'secret',
      timeEntries: [{ id: 't1' }],
      expenses: [{ id: 'e1' }],
      notes: [{ id: 'n1', isPrivate: true }, { id: 'n2', isPrivate: false }]
    });

    expect(sanitized.internalNotes).toBeUndefined();
    expect(sanitized.timeEntries).toBeUndefined();
    expect(sanitized.expenses).toBeUndefined();
    expect(sanitized.notes).toHaveLength(1);
  });

  test('userCanAccessCase allows client when clientId matches', async () => {
    const prisma = require('../src/lib/prisma');
    jest.spyOn(prisma.client, 'findFirst').mockResolvedValue({ id: 'client-1' });

    const allowed = await userCanAccessCase(
      { role: 'CLIENT', email: 'client@example.com' },
      { clientId: 'client-1' }
    );

    expect(allowed).toBe(true);
    prisma.client.findFirst.mockRestore();
  });
});
