export function getQueryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

export function getQueryParam(key) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(key);
}
