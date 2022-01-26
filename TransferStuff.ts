/*
This file is part of TransferStuff.

TransferStuff is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

TransferStuff is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with TransferStuff. If not, see <https://www.gnu.org/licenses/>. 
*/

import type { FoundryVTT } from './fvtt';
import { registerSettings } from './settings.js';

const MODNAME = 'TRANSFERSTUFF';
const moduleName = 'transfer-stuff'; // the value in module.json/name

(function() {
    function isAlt() {
        // check if Alt and only Alt is being pressed during the drop event.
        const alts = new Set(["Alt", "AltLeft"]);
        return (game.keyboard.downKeys.size == 1 && game.keyboard.downKeys.intersects(alts));
    }

    function checkCompatible(actorTypeName1: FoundryVTT.ActorType, actorTypeName2: FoundryVTT.ActorType, item: FoundryVTT.FutureItem) {
        console.info('TransferStuff | Check Compatibility: Dragging Item:"' + String(item.data.type) + '" from sourceActor.data.type:"' + String(actorTypeName1) + '" to dragTarget.data.type:"' + String(actorTypeName2) + '".');

        const transferBetweenSameTypeActors = game.settings.get(moduleName, 'actorTransferSame');
        if(transferBetweenSameTypeActors && actorTypeName1 == actorTypeName2) {
            return true;
        }
        try {
            const transferPairs = JSON.parse("{" + game.settings.get(moduleName, 'actorTransferPairs') + "}");
            const withActorTypeName1 = transferPairs[actorTypeName1];
            const withActorTypeName2 = transferPairs[actorTypeName2];
            if(Array.isArray(withActorTypeName1) && withActorTypeName1.indexOf(actorTypeName2) !== -1) return true;
            if(Array.isArray(withActorTypeName2) && withActorTypeName2.indexOf(actorTypeName1) !== -1) return true;
            if(withActorTypeName1 == actorTypeName2) return true;
            if(withActorTypeName2 == actorTypeName1) return true;
        }
        catch(err: any) {
            console.error('TransferStuff | ', err.message);
            ui.notifications.error('TransferStuff | ' + err.message);
        }
        return false;
    }

    function deleteItem(sheet: FoundryVTT.Sheet, itemId: FoundryVTT.ItemId) {
        if(sheet.actor.deleteEmbeddedDocuments != undefined) {
            sheet.actor.deleteEmbeddedDocuments("Item", [itemId]);
        }
        else {
            sheet.actor.deleteOwnedItem(itemId);
        }
    }

    function deleteItemIfZero(sheet: FoundryVTT.Sheet, itemId: FoundryVTT.ItemId) {
        const item = sheet.actor.data.items.get(itemId);
        if(item == undefined) {
            return;
        }
        if(item.data.data.quantity <= 0) {
            deleteItem(sheet, itemId);
        }
    }

    function transferItem(sourceSheet: FoundryVTT.Sheet, targetSheet: FoundryVTT.Sheet, originalItemId: FoundryVTT.ItemId, createdItem: FoundryVTT.FutureItem, originalQuantity: number, transferedQuantity: number, stackItems: boolean) {
        const originalItem = sourceSheet.actor.items.get(originalItemId);
        if(originalItem == undefined) {
            console.error("Could not find the source item", originalItemId);
            return;
        }

        if(transferedQuantity > 0 && transferedQuantity <= originalQuantity) {
            const newOriginalQuantity = originalQuantity - transferedQuantity;
            let stacked = false; // will be true if a stack of item has been found and items have been stacked in it
            if(stackItems) {
                const potentialStacks = targetSheet.actor.data.items.filter(i => i.name == originalItem.name && diffObject(createdItem, i) && i.data._id !== createdItem.data._id);
                if(potentialStacks.length >= 1) {
                    potentialStacks[0].update({ "data.quantity": potentialStacks[0].data.data.quantity + transferedQuantity });
                    deleteItemIfZero(targetSheet, createdItem.data._id);
                    stacked = true;
                }
            }

            originalItem.update({ "data.quantity": newOriginalQuantity }).then((i) => deleteItemIfZero(i.actor.sheet, i.data._id));
            if(stacked === false) {
                createdItem.data.data.quantity = transferedQuantity;
                targetSheet.actor.createEmbeddedDocuments("Item", [createdItem.data])
            }
        }
        else {
            ui.notifications.error('TransferStuff | could not transfer ' + transferedQuantity + " items");
        }
    }

    function transferCurrency(html: JQuery, sourceSheet: FoundryVTT.Sheet, targetSheet: FoundryVTT.Sheet) {
        let currencies = ["pp", "gp", "ep", "sp", "cp"];

        let errors = [];
        for(let c of currencies) {
            const amount = parseInt(html.find("." + c).val(), 10);
            if(amount < 0 || amount > sourceSheet.actor.data.data.currency[c]) {
                errors.push(c);
            }
        }

        if(errors.length !== 0) {
            ui.notifications.error("TransferStuff | " + game.i18n.localize(MODNAME + ".notEnoughCurrency") + " " + errors.join(", "));
        }
        else {
            for(let c of currencies) {
                const amount = parseInt(html.find("." + c + " input").val(), 10);
                const key = "data.currency." + c;
                sourceSheet.actor.update({ [key]: sourceSheet.actor.data.data.currency[c] - amount });
                targetSheet.actor.update({ [key]: targetSheet.actor.data.data.currency[c] + amount }); // key is between [] to force its evaluation
            }
        }
    }

    function showItemTransferDialog(originalQuantity: number, sourceSheet: FoundryVTT.Sheet, targetSheet: FoundryVTT.Sheet, originalItemId: FoundryVTT.ItemId, createdItem: FoundryVTT.FutureItem) {
        let transferDialog = new Dialog({
            title: 'How many items do you want to move?',
            content: `
              <form class="transferstuff item">
                <div class="form-group">
                  <input type="number" class="transferedQuantity" value="${originalQuantity}" min="0" max="${originalQuantity}" />
                  <button onclick="this.parentElement.querySelector('.transferedQuantity').value = '1'">${game.i18n.localize(MODNAME + ".one")}</button>
                  <button onclick="this.parentElement.querySelector('.transferedQuantity').value = '${Math.round(originalQuantity / 2)}'">${game.i18n.localize(MODNAME + ".half")}</button>
                  <button onclick="this.parentElement.querySelector('.transferedQuantity').value = '${originalQuantity}'">${game.i18n.localize(MODNAME + ".max")}</button>
                  <label style="flex: none;"><input style="vertical-align: middle;" type="checkbox" class="stack" checked="checked" /> ${game.i18n.localize(MODNAME + ".stackItems")}</label>
                </div>
              </form>`,
            buttons: {
                transfer: {
                    //icon: "<i class='fas fa-check'></i>",
                    label: game.i18n.localize(MODNAME + ".transfer"),
                    callback: html => {
                        const transferedQuantity = parseInt(html.find('input.transferedQuantity').val(), 10);
                        const stackItems = html.find('input.stack').is(":checked");
                        transferItem(sourceSheet, targetSheet, originalItemId, createdItem, originalQuantity, transferedQuantity, stackItems);
                    }
                }
            },
            default: 'transfer'
        });
        transferDialog.render(true);
    }

    function disabledIfZero(n: number): "disabled" | "" {
        if(n === 0) {
            return "disabled";
        }
        return "";
    }

    function showCurrencyTransferDialog(sourceSheet: FoundryVTT.Sheet, targetSheet: FoundryVTT.Sheet) {
        let transferDialog = new Dialog({
            title: game.i18n.localize(MODNAME + ".howMuchCurrency"),
            content: `
              <form class="transferstuff currency">
                <div class="form-group">
                  <span class="currency pp"><i class="fas fa-coins"></i><span>Platinum: </span><input type="number" value="0" min="0" ${disabledIfZero(sourceSheet.actor.data.data.currency.pp)} max="${sourceSheet.actor.data.data.currency.pp}" /></span>
                  <span class="currency gp"><i class="fas fa-coins"></i><span>Gold: </span><input type="number" value="0" min="0" ${disabledIfZero(sourceSheet.actor.data.data.currency.gp)} max="${sourceSheet.actor.data.data.currency.gp}" /></span>
                  <span class="currency ep"><i class="fas fa-coins"></i><span>Electrum: </span><input type="number" value="0" min="0" ${disabledIfZero(sourceSheet.actor.data.data.currency.ep)} max="${sourceSheet.actor.data.data.currency.ep}" /></span>
                  <span class="currency sp"><i class="fas fa-coins"></i><span>Silver: </span><input type="number" value="0" min="0" ${disabledIfZero(sourceSheet.actor.data.data.currency.sp)} max="${sourceSheet.actor.data.data.currency.sp}" /></span>
                  <span class="currency cp"><i class="fas fa-coins"></i><span>Copper: </span><input type="number" value="0" min="0" ${disabledIfZero(sourceSheet.actor.data.data.currency.cp)} max="${sourceSheet.actor.data.data.currency.cp}" /></span>
                </div>
              </form>`,
            buttons: {
                transfer: {
                    //icon: "<i class='fas fa-check'></i>",
                    label: `Transfer`,
                    callback: html => {
                        transferCurrency(html, sourceSheet, targetSheet);
                    }
                }
            },
            default: game.i18n.localize(MODNAME + ".transfer")
        });
        transferDialog.render(true);
    }

    Hooks.once('init', () => {
        registerSettings();
    });

    Hooks.on('dropActorSheetData', (targetActor, targetSheet, futureItem) => {
        if(isAlt()) {
            return;  // ignore when Alt is pressed to drop.
        }

        if(targetActor.permission != 3) {
            ui.notifications.error("TransferStuff | You don't have the permissions to transfer items here");
            return;
        }

        if(futureItem.type == "Item" && futureItem.actorId) {
            if(!targetActor.data._id) {
                console.warn("TransferStuff | target has no data._id?", targetActor);
                return;
            }
            if(targetActor.data._id == futureItem.actorId) {
                return;  // ignore dropping on self
            }
            let sourceSheet: FoundryVTT.Sheet;
            if(futureItem.tokenId != null) {
                //game.scenes.get("hyfUtn3VVPnVUpJe").tokens.get("OYwRVJ7crDyid19t").sheet.actor.items
                sourceSheet = game.scenes.get(futureItem.sceneId)!.tokens.get(futureItem.tokenId)!.sheet;
            }
            else {
                sourceSheet = game.actors.get(futureItem.actorId)!.sheet;
            }
            let sourceActor = game.actors.get(futureItem.actorId);
            if(sourceActor) {
                /* if both source and target have the same type then allow deleting original item. this is a safety check because some game systems may allow dropping on targets that don't actually allow the GM or player to see the inventory, making the item inaccessible. */
                if(checkCompatible(sourceActor.data.type, targetActor.data.type, futureItem)) {
                    const originalQuantity = futureItem.data.data.quantity;
                    const targetActorId = targetActor.data._id;
                    const sourceActorId = futureItem.actorId;
                    if(game.settings.get(moduleName, 'enableCurrencyTransfer') && futureItem.data.name === "Currency") {
                        showCurrencyTransferDialog(sourceSheet, targetSheet);
                        return false;
                    }
                    else if(game.settings.get(moduleName, 'enableItemTransfer') && originalQuantity >= 1) {
                        showItemTransferDialog(originalQuantity, sourceSheet, targetSheet, futureItem.data._id, futureItem);
                        return false;
                    }
                }
            }
        }
    });
})();