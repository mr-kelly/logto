import { load } from 'js-yaml';
import Koa from 'koa';
import Router from 'koa-router';
import request from 'supertest';
import { number, object, string } from 'zod';

import koaGuard from '@/middleware/koa-guard';
import koaPagination from '@/middleware/koa-pagination';
import { AnonymousRouter } from '@/routes/types';

import swaggerRoutes, { paginationParameters } from './swagger';

jest.mock('js-yaml', () => ({
  load: jest.fn().mockReturnValue({}),
}));

const createSwaggerRequest = (
  allRouters: Array<Router<unknown, any>>,
  swaggerRouter: AnonymousRouter = new Router()
) => {
  swaggerRoutes(swaggerRouter, allRouters);
  const app = new Koa();
  app.use(swaggerRouter.routes()).use(swaggerRouter.allowedMethods());

  return request(app.callback());
};

describe('GET /swagger.json', () => {
  const mockRouter = new Router();
  mockRouter.get('/mock', () => ({}));
  mockRouter.patch('/mock', () => ({}));
  mockRouter.post('/mock', () => ({}));
  mockRouter.delete('/mock', () => ({}));

  const testRouter = new Router();
  testRouter.options('/test', () => ({}));
  testRouter.put('/test', () => ({}));

  const mockSwaggerRequest = createSwaggerRequest([mockRouter, testRouter]);

  it('should contain the standard fields', async () => {
    const response = await mockSwaggerRequest.get('/swagger.json');
    expect(response.status).toEqual(200);
    expect(response.body).toMatchObject({
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      openapi: expect.any(String),
      info: expect.objectContaining({
        title: expect.any(String),
        version: expect.any(String),
      }),
      paths: expect.any(Object),
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
  });

  it('should contain the specific paths', async () => {
    const response = await mockSwaggerRequest.get('/swagger.json');
    expect(Object.entries(response.body.paths)).toHaveLength(2);
    expect(response.body.paths).toMatchObject({
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      '/api/mock': {
        get: expect.anything(),
        patch: expect.anything(),
        post: expect.anything(),
        delete: expect.anything(),
      },
      '/api/test': {
        options: expect.anything(),
        put: expect.anything(),
      },
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
  });

  it('should generate the tags', async () => {
    const response = await mockSwaggerRequest.get('/swagger.json');
    expect(response.body.paths).toMatchObject(
      expect.objectContaining({
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        '/api/mock': expect.objectContaining({
          get: expect.objectContaining({ tags: ['Mock'] }),
        }),
        '/api/test': expect.objectContaining({
          put: expect.objectContaining({ tags: ['Test'] }),
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      })
    );
  });

  it('should parse the path parameters', async () => {
    const queryParametersRouter = new Router();
    queryParametersRouter.get(
      '/mock/:id/:field',
      koaGuard({
        params: object({
          id: number(),
          field: string(),
        }),
      }),
      () => ({})
    );
    const swaggerRequest = createSwaggerRequest([queryParametersRouter]);

    const response = await swaggerRequest.get('/swagger.json');
    expect(response.body.paths).toMatchObject(
      expect.objectContaining({
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        '/api/mock/:id/:field': {
          get: expect.objectContaining({
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'number' },
              },
              {
                name: 'field',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
          }),
        },
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      })
    );
  });

  describe('parse query parameters', () => {
    it('should parse the normal query parameters', async () => {
      const queryParametersRouter = new Router();
      queryParametersRouter.get(
        '/mock',
        koaGuard({
          query: object({
            id: number(),
            name: string().optional(),
          }),
        }),
        () => ({})
      );
      const swaggerRequest = createSwaggerRequest([queryParametersRouter]);
      const response = await swaggerRequest.get('/swagger.json');
      expect(response.body.paths).toMatchObject(
        expect.objectContaining({
          /* eslint-disable @typescript-eslint/no-unsafe-assignment */
          '/api/mock': {
            get: expect.objectContaining({
              parameters: [
                {
                  name: 'id',
                  in: 'query',
                  required: true,
                  schema: {
                    type: 'number',
                  },
                },
                {
                  name: 'name',
                  in: 'query',
                  required: false,
                  schema: {
                    type: 'string',
                  },
                },
              ],
            }),
          },
          /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        })
      );
    });

    it('should append page and page_size to the query parameters when the route uses pagination', async () => {
      const queryParametersRouter = new Router();
      queryParametersRouter.get('/mock', koaPagination(), () => ({}));
      const swaggerRequest = createSwaggerRequest([queryParametersRouter]);
      const response = await swaggerRequest.get('/swagger.json');
      expect(response.body.paths).toMatchObject(
        expect.objectContaining({
          /* eslint-disable @typescript-eslint/no-unsafe-assignment */
          '/api/mock': {
            get: expect.objectContaining({
              parameters: paginationParameters,
            }),
          },
          /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        })
      );
    });
  });

  it('should parse the request body', async () => {
    const queryParametersRouter = new Router();
    queryParametersRouter.post(
      '/mock',
      koaGuard({
        body: object({
          name: string(),
        }),
      }),
      () => ({})
    );
    const swaggerRequest = createSwaggerRequest([queryParametersRouter]);
    const response = await swaggerRequest.get('/swagger.json');
    expect(response.body.paths).toMatchObject(
      expect.objectContaining({
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        '/api/mock': {
          post: expect.objectContaining({
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                      name: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          }),
        },
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      })
    );
  });

  it('should append custom status code', async () => {
    const mockRouter = new Router();
    mockRouter.get('/mock', () => ({}));
    mockRouter.patch('/mock', () => ({}));
    mockRouter.post('/mock', () => ({}));
    mockRouter.delete('/mock', () => ({}));
    (load as jest.Mock).mockReturnValueOnce({
      '/mock': {
        get: 204,
        patch: 202,
        post: 201,
        delete: 203,
      },
    });

    const swaggerRequest = createSwaggerRequest([mockRouter]);
    const response = await swaggerRequest.get('/swagger.json');
    expect(response.body.paths).toMatchObject(
      expect.objectContaining({
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        '/api/mock': {
          get: expect.objectContaining({
            responses: {
              '204': expect.any(Object),
            },
          }),
          patch: expect.objectContaining({
            responses: {
              '202': expect.any(Object),
            },
          }),
          post: expect.objectContaining({
            responses: {
              '201': expect.any(Object),
            },
          }),
          delete: expect.objectContaining({
            responses: {
              '203': expect.any(Object),
            },
          }),
        },
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      })
    );
  });
});
