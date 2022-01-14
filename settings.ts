/*
This file is part of TransferStuff.

TransferStuff is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

TransferStuff is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with TransferStuff. If not, see <https://www.gnu.org/licenses/>. 
*/

export function registerSettings() {
    const moduleName = 'TransferStuff';
    const MODNAME = 'TRANSFERSTUFF';

    game.settings.register(moduleName, 'enableItemTransfer', {
        name: game.i18n.localize(MODNAME + ".enableItemTransfer"),
        hint: game.i18n.localize(MODNAME + ".enableItemTransferHint"),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(moduleName, 'enableCurrencyTransfer', {
        name: game.i18n.localize(MODNAME + ".enableCurrencyTransfer"),
        hint: game.i18n.localize(MODNAME + ".enableCurrencyTransferHint"),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
    });

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
