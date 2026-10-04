import { createTestApi, type TestApi } from './support/app.js';

describe('AppController (e2e)', () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await createTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  it('GET /health', async () => {
    const response = await api.get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});
