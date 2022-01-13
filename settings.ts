"use strict";

export function registerSettings() {
    const moduleName = 'TransferStuff';
    const MODNAME = 'TRANSFERSTUFF';

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
        onChange: (value: string) => {
            try {
                JSON.parse("{" + value + "}");
            }
            catch(err: any) {
                ui.notifications.error(err.message);
                throw err;
            }
        }
    });
};
