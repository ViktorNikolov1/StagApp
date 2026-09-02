import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  deleteTokens,
} from '../utils/secure-token-storage';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(mockStore.get(key) ?? null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

describe('secure-token-storage', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('should save and retrieve access token', async () => {
    await saveTokens('access-123', 'refresh-456');
    const accessToken = await getAccessToken();
    expect(accessToken).toBe('access-123');
  });

  it('should save and retrieve refresh token', async () => {
    await saveTokens('access-123', 'refresh-456');
    const refreshToken = await getRefreshToken();
    expect(refreshToken).toBe('refresh-456');
  });

  it('should return null when no token is stored', async () => {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  it('should delete tokens', async () => {
    await saveTokens('access-123', 'refresh-456');
    await deleteTokens();
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });
});
