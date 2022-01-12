"use strict";
export function registerSettings() {
    var moduleName = 'DragTransfer';
    var MODNAME = 'DRAGTANSFER';
    game.settings.register(moduleName, 'actorTransferSame', {
        name: game.i18n.localize(MODNAME + ".actorTransferSame"),
        hint: game.i18n.localize(MODNAME + ".actorTransferSameHint"),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
    });
    game.settings.register(moduleName, 'actorTransferPairs', {
        name: game.i18n.localize(MODNAME + ".actorTransferPairs"),
        hint: game.i18n.localize(MODNAME + ".actorTransferPairsHint"),
        scope: 'world',
        config: true,
        type: String,
        default: "",
        onChange: function (value) {
            try {
                JSON.parse("{" + value + "}");
            }
            catch (err) {
                ui.notifications.error(err.message);
                throw err;
            }
        }
    });
}
;
