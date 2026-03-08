import axios from 'axios';

function extractMessageFromPayload(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return extractMessageFromPayload(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error.trim();
    }
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = extractMessageFromPayload(error.response?.data);
    if (responseMessage) {
      return responseMessage;
    }
  }

  if (error instanceof Error) {
    const errorMessage = extractMessageFromPayload(error.message) ?? error.message.trim();
    if (errorMessage) {
      return errorMessage;
    }
  }

  return fallback;
}
