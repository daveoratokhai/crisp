/** localStorage key for the viewer's theme. Shared by the store and the script. */
export const THEME_KEY = "crisp-theme";

/**
 * Runs before paint so a saved theme never flashes the wrong one.
 * A plain module, not the client theme store, because the root layout (a
 * server component) reads this string directly.
 */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
