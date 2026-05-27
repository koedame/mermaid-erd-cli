/**
 * Lazily load an optional database driver. Keeping these out of the static
 * import graph means dump-only users (and anyone targeting just one engine)
 * don't need every native dependency installed.
 */
export async function requireDriver<T>(pkg: string, label: string): Promise<T> {
  try {
    return (await import(/* @vite-ignore */ pkg)) as T;
  } catch (err) {
    throw new Error(
      `${label} support needs the "${pkg}" package. Install it with:\n` + `  npm install ${pkg}`,
    );
  }
}
