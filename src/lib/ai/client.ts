// Design Ref: §6.1 — Gemini SDK 래퍼
// Plan SC: SC-6 (API 키 클라이언트 노출 금지)
// 이 파일은 서버에서만 import 되어야 함 (route handler에서만 사용)

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { TOOL_DECLARATIONS } from './tools';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    '[ai/client] GEMINI_API_KEY is not set. AI features will fail at runtime.',
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// gemini-2.0-flash는 일부 프로젝트에서 free tier quota=0인 경우가 있어
// 같은 무료 한도이면서 더 안정적으로 할당되는 gemini-2.5-flash를 사용.
export const DEFAULT_MODEL = 'gemini-2.5-flash';

export class GeminiNotConfiguredError extends Error {
  code = 'GEMINI_NOT_CONFIGURED' as const;
  constructor() {
    super('GEMINI_API_KEY is not configured on the server.');
    this.name = 'GeminiNotConfiguredError';
  }
}

/**
 * Gemini 모델 인스턴스 생성. systemInstruction과 tools가 자동 주입됨.
 * 호출 측은 generateContentStream / sendMessage 사용.
 */
export function getModel(systemInstruction: string): GenerativeModel {
  if (!genAI) throw new GeminiNotConfiguredError();
  return genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });
}

export function isGeminiConfigured(): boolean {
  return Boolean(apiKey);
}
