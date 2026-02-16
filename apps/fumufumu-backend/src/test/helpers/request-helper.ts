/**
 * APIリクエスト用のRequestオブジェクトを生成する
 */
export function createApiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options: {
    body?: any;
    cookie?: string;
    queryParams?: Record<string, string | number | boolean>;
  } = {}
) {
  let url = `http://localhost${path}`;
  
  // クエリパラメータの付与
  if (options.queryParams) {
    const searchParams = new URLSearchParams();
    Object.entries(options.queryParams).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const headers = new Headers();
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.cookie) {
    headers.set('Cookie', options.cookie);
  }

  return new Request(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : null,
  });
}
