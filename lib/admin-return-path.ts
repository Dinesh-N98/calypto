export function isValidAdminReturnPath(value: unknown): value is string {
  // Reject percent escapes entirely because browsers normalize encoded dot segments such as %2e%2e.
  if (
    typeof value !== "string" ||
    !/^\/admin(?:\/|$)/.test(value) ||
    /[\\\s\u0000-\u001f\u007f-\u009f]/u.test(value) ||
    value.includes("//") ||
    value.includes(":") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("%")
  ) {
    return false;
  }

  return !value.split("/").some((segment) => segment === "." || segment === "..");
}

export function getValidatedAdminReturnPath(value: unknown, defaultPath: string): string {
  return isValidAdminReturnPath(value) ? value : defaultPath;
}