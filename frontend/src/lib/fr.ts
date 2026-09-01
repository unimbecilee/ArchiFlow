/** Pluriel français : 0 et 2+ au pluriel, 1 au singulier. */
export function pluralFr(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
