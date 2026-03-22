const BASE_URL = process.env.DOWNSTREAM_API_URL!;

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor() {
    super('Invalid email or password');
  }
}

export class DownstreamError extends Error {
  readonly status = 502;
}

type LoginResponse = {
  sessionId: string;
};

export async function loginDownstream(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new AuthenticationError();
  }

  if (!res.ok) {
    throw new DownstreamError(`Downstream auth error: ${res.status}`);
  }

  return res.json() as Promise<LoginResponse>;
}
