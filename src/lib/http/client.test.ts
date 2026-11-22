import { http as mswHttp, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { ApiError } from './apiError';
import { configureHttpAuth, http, API_URL } from './client';

describe('cliente HTTP', () => {
  it('converte Problem Details em ApiError com code, fields e rule', async () => {
    server.use(
      mswHttp.get(`${API_URL}/teste`, () =>
        HttpResponse.json(
          { type: 'x', title: 'x', status: 422, code: 'PAYMENTS_TO_REVIEW', rule: 'RN-40', fields: { a: 'b' } },
          { status: 422 },
        ),
      ),
    );
    configureHttpAuth({
      getAccessToken: () => null,
      refresh: () => Promise.reject(new Error('x')),
      onSessionExpired: () => {},
    });

    const error = await http.get('/teste').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'PAYMENTS_TO_REVIEW', rule: 'RN-40', fields: { a: 'b' } });
  });

  it('em 401, renova a sessão uma única vez para chamadas simultâneas e repete as requisições', async () => {
    let token = 'velho';
    const refresh = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      token = 'novo';
      return token;
    });
    configureHttpAuth({ getAccessToken: () => token, refresh, onSessionExpired: vi.fn() });
    server.use(
      mswHttp.get(`${API_URL}/protegido`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer novo'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ type: 'x', title: 'x', status: 401, code: 'UNAUTHENTICATED' }, { status: 401 }),
      ),
    );

    const results = await Promise.all([http.get('/protegido'), http.get('/protegido'), http.get('/protegido')]);
    expect(results.map((r) => r.data)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('se a renovação falha, avisa que a sessão acabou e devolve UNAUTHENTICATED', async () => {
    const onSessionExpired = vi.fn();
    configureHttpAuth({
      getAccessToken: () => 'x',
      refresh: () => Promise.reject(new Error('acabou')),
      onSessionExpired,
    });
    server.use(
      mswHttp.get(`${API_URL}/protegido`, () =>
        HttpResponse.json({ type: 'x', title: 'x', status: 401, code: 'UNAUTHENTICATED' }, { status: 401 }),
      ),
    );

    await expect(http.get('/protegido')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
