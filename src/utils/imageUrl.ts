export const bustCache = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  const date = new Date();
  const key = `${date.getFullYear()}${date.getMonth()}${date.getDate()}`;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${key}`;
};
