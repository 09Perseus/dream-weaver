/**
 * Translates Japanese PAY.JP error messages and other non-English
 * API errors into user-friendly English strings.
 */

const payjpErrorMap: Record<string, string> = {
  "既にインスタンス化されています": "Payment form already loaded. Please refresh the page.",
  "本番環境が利用できません": "Live payments not available. Please use test mode.",
  "このアカウントでは本番環境が利用できません": "Live mode not available for this account. Use test card.",
  "カード番号が不正です": "Invalid card number. Please check and try again.",
  "有効期限が不正です": "Invalid expiry date. Please check and try again.",
  "セキュリティコードが不正です": "Invalid security code. Please check and try again.",
  "カードが拒否されました": "Card declined. Please try a different card.",
  "残高不足です": "Insufficient funds. Please try a different card.",
  "カードの有効期限が切れています": "Card expired. Please use a different card.",
  "不正なリクエストです": "Invalid request. Please try again.",
  "認証エラーです": "Authentication error. Please refresh and try again.",
  "レート制限を超えました": "Too many attempts. Please wait a moment and try again.",
};

export const ensureEnglishError = (message: string): string => {
  if (!message) return "An unexpected error occurred.";

  // Check exact PAY.JP matches first
  for (const [japanese, english] of Object.entries(payjpErrorMap)) {
    if (message.includes(japanese)) return english;
  }

  const hasJapanese = /[\u3000-\u9fff\u30A0-\u30FF\u3040-\u309F]/.test(message);
  if (!hasJapanese) return message;

  // Keyword-based fallbacks
  if (message.includes("本番環境"))
    return "Live payments not available. Please use test card 4242 4242 4242 4242.";
  if (message.includes("インスタンス化"))
    return "Payment form error. Please refresh the page.";
  if (message.includes("カード"))
    return "Card error. Please check your card details.";
  if (message.includes("残高")) return "Insufficient funds.";
  if (message.includes("有効期限")) return "Card expired.";
  if (message.includes("拒否")) return "Card declined.";

  return "Payment error. Please try again or use a different card.";
};

const supabaseErrorMap: Record<string, string> = {
  "jwt expired": "Your session has expired. Please sign in again.",
  "invalid login credentials": "Incorrect email or password.",
  "email not confirmed": "Please confirm your email before signing in.",
  "user already registered": "An account with this email already exists.",
  "password should be at least 6 characters": "Password must be at least 6 characters.",
  "new row violates row-level security": "Permission denied. Please sign in and try again.",
  "duplicate key value": "This item already exists.",
  "violates foreign key constraint": "This item could not be found.",
};

export const friendlySupabaseError = (error: any): string => {
  const msg = error?.message || "Something went wrong";
  const lower = msg.toLowerCase();

  for (const [key, friendly] of Object.entries(supabaseErrorMap)) {
    if (lower.includes(key)) return friendly;
  }

  return ensureEnglishError(msg);
};
