// Destiny manifest files are kept in the browser between visits: bungie.net only lets the HTTP cache keep them
// for 30 minutes. Their urls carry a content hash, so a manifest update brings new urls and a cached copy is
// current exactly when its url is still listed in the manifest.

const CACHE_PREFIX = "destiny-manifest-";
// Bump the version when the stored format changes, so copies in the old format are never read
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const fileUrl = (path: string) => `https://www.bungie.net${path}`;

/** Undefined where the Cache API is unavailable (insecure origin, some private modes...): files are then downloaded every time. */
const openCache = async () => {
    try {
        return typeof caches === "undefined" ? undefined : await caches.open(CACHE_NAME);
    } catch {
        return undefined;
    }
}

/**
 * Gets a manifest file, from the cache when this version was already downloaded.
 * Copies are stored gzipped: the 200 MB of item definitions take about 10 MB on disk and read back as fast.
 */
export const fetchManifestFile = async <T>(path: string): Promise<T> => {
    const url = fileUrl(path);
    const cache = await openCache();

    const cached = await cache?.match(url, { ignoreVary: true }).catch(() => undefined);
    if (cached?.body) {
        try {
            return await new Response(cached.body.pipeThrough(new DecompressionStream("gzip"))).json();
        } catch (error) {
            // A truncated or corrupted copy: drop it and download the file again
            console.warn(`Dropping unreadable cached ${path}`, error);
            await cache?.delete(url).catch(() => undefined);
        }
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
    if (cache) {
        // Stored while the response is parsed; failing to store (quota...) only means downloading it again next time
        const copy = response.clone();
        cache.put(url, new Response(copy.body?.pipeThrough(new CompressionStream("gzip"))))
            .catch((error) => console.warn(`Could not cache ${path}`, error));
    }
    return response.json();
}

/** Deletes the cached files that are no longer in the manifest (older versions) and caches left by older formats. */
export const pruneManifestCache = async (currentPaths: string[]) => {
    const cache = await openCache();
    if (!cache) return;

    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));

    const current = new Set(currentPaths.map(fileUrl));
    const requests = await cache.keys();
    await Promise.all(requests.filter((request) => !current.has(request.url)).map((request) => cache.delete(request)));
}
