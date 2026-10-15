/**
 * Pick only allowed keys from an object to prevent mass-assignment attacks.
 */
export const pick = <T extends Record<string, any>>(
  obj: T,
  keys: string[]
): Partial<T> => {
  return keys.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (result as any)[key] = obj[key];
    }
    return result;
  }, {} as Partial<T>);
};