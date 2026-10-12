const ACCESS_KEY = "agriwatch_portal_access";
const LOGIN_ATTEMPT_KEY = "agriwatch_login_attempt";

export function grantPortalAccess(userId, role) {
  if (!userId || !role) return;
  sessionStorage.setItem(
    ACCESS_KEY,
    JSON.stringify({ userId, role, grantedAt: Date.now() })
  );
}

export function getPortalAccess() {
  try {
    const raw = sessionStorage.getItem(ACCESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.userId || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPortalAccess() {
  sessionStorage.removeItem(ACCESS_KEY);
}

export function markLoginAttempt(method = "google", role = null) {
  sessionStorage.setItem(
    LOGIN_ATTEMPT_KEY,
    JSON.stringify({ method, role, startedAt: Date.now() })
  );
}

export function getLoginAttempt() {
  try {
    const raw = sessionStorage.getItem(LOGIN_ATTEMPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ignore stale callbacks older than 10 minutes.
    if (!parsed?.startedAt || Date.now() - parsed.startedAt > 10 * 60 * 1000) {
      sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLoginAttempt() {
  sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);
}
