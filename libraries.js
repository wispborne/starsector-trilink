/*
 * Common Starsector libraries for the "Quick add" buttons.
 *
 * This is the one file to edit when you want to add, remove, reorder, or update a
 * library shown in the Dependencies "Quick add" row. No build step — just edit and
 * save, then reload the page.
 *
 * Each entry needs three things:
 *   name — the label shown on the button, e.g. "MagicLib".
 *   id   — the mod's id, exactly as it appears in its mod_info.json. TriOS uses
 *          this to skip a library the player already has installed.
 *   url  — the link the button fills in. Prefer the mod's .version file when that
 *          file contains a directDownloadURL: the link then keeps working as the
 *          library releases new versions. If the .version has no directDownloadURL
 *          (LazyLib, for example), use a direct .zip link instead — but then you'll
 *          need to update it here by hand whenever a new version ships.
 *
 * To add a library: copy a line, change the three values, save.
 * To remove one: delete its line.
 * The order here is the order the buttons appear in.
 */
self.TRILINK_LIBRARIES = [
  { name: 'LazyLib', id: 'lw_lazylib', url: 'https://github.com/LazyWizard/lazylib/releases/download/3.0/LazyLib.3.0.zip' },
  { name: 'MagicLib', id: 'MagicLib', url: 'https://raw.githubusercontent.com/MagicLibStarsector/MagicLib/master/magiclib.version' },
  { name: 'GraphicsLib', id: 'shaderLib', url: 'https://bitbucket.org/DarkRevenant/graphicslib/downloads/graphicsLib.version' },
  { name: 'LunaLib', id: 'lunalib', url: 'https://raw.githubusercontent.com/Lukas22041/LunaLib/main/LunaLib.version' },
];
