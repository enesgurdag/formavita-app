/** expo-router param değerleri cihazda string[] olabilir */
export function paramString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
