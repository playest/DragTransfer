/*
This file is part of TransferStuff.

TransferStuff is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

TransferStuff is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with TransferStuff. If not, see <https://www.gnu.org/licenses/>. 
*/

import type { FoundryVTT } from './fvtt';
import { registerSettings } from './settings.js';

const MODNAME = 'TRANSFERSTUFF';

(function() {
    function isAlt() {
        // check if Alt and only Alt is being pressed during the drop event.
        const alts = new Set(["Alt", "AltLeft"]);
        return (game.keyboard.downKeys.size == 1 && game.keyboard.downKeys.intersects(alts));
    }

    function checkCompatible(actorTypeName1: FoundryVTT.ActorType, actorTypeName2: FoundryVTT.ActorType, item: FoundryVTT.FutureItem) {
        console.info('TransferStuff | Check Compatibility: Dragging Item:"' + String(item.data.type) + '" from sourceActor.data.type:"' + String(actorTypeName1) + '" to dragTarget.data.type:"' + String(actorTypeName2) + '".');

        const transferBetweenSameTypeActors = game.settings.get('TransferStuff', 'actorTransferSame');
        if(transferBetweenSameTypeActors && actorTypeName1 == actorTypeName2) {
            return true;
        }
        try {
            const transferPairs = JSON.parse("{" + game.settings.get('TransferStuff', 'actorTransferPairs') + "}");
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

    function deleteItem(actor: FoundryVTT.Actor, itemId: FoundryVTT.ItemId) {
        if(actor.deleteEmbeddedDocuments != undefined) {
            actor.deleteEmbeddedDocuments("Item", [itemId]);
        }
        else {
            actor.deleteOwnedItem(itemId);
        }
    }

    function deleteItemIfZero(actor: FoundryVTT.Actor, itemId: FoundryVTT.ItemId) {
        const item = actor.items.get(itemId);
        if(item == undefined) {
            return;
        }
        if(item.data.data.quantity <= 0) {
            deleteItem(actor, itemId);
        }
    }

    function transferItem(originalActor: FoundryVTT.Actor, targetActorId: FoundryVTT.ActorId, originalItemId: FoundryVTT.ItemId, createdItem: FoundryVTT.FutureItem, originalQuantity: number, transferedQuantity: number, stackItems: boolean) {
        const originalItem = originalActor.items.get(originalItemId);
        const targetActor = game.actors.get(targetActorId)!;
        if(originalItem == undefined) {
            console.error("Could not find the source item", originalItemId);
            return;
        }

        if(transferedQuantity > 0 && transferedQuantity <= originalQuantity) {
            const newOriginalQuantity = originalQuantity - transferedQuantity;
            let stacked = false; // will be true if a stack of item has been found and items have been stacked in it
            if(stackItems) {
                const potentialStacks = targetActor.items.filter(i => i.name == originalItem.name && diffObject(createdItem, i) && i.data._id !== createdItem.data._id);
                if(potentialStacks.length >= 1) {
                    potentialStacks[0].update({ "data.quantity": potentialStacks[0].data.data.quantity + transferedQuantity });
                    deleteItemIfZero(targetActor, createdItem.data._id);
                    stacked = true;
                }
            }

            originalItem.update({ "data.quantity": newOriginalQuantity }).then((i) => deleteItemIfZero(i.parent, i.data._id));
            if(stacked === false) {
                createdItem.data.data.quantity = transferedQuantity;
                targetActor.createEmbeddedDocuments("Item", [createdItem.data])
            }
        }
        else {
            ui.notifications.error('TransferStuff | could not transfer ' + transferedQuantity + " items");
        }
    }

    function transferCurrency(html: JQuery, sourceActorId: FoundryVTT.ActorId, targetActorId: FoundryVTT.ActorId) {
        let currencies = ["pp", "gp", "ep", "sp", "cp"];
        const sourceActor = game.actors.get(sourceActorId)!;

        let errors = [];
        for(let c of currencies) {
            const amount = parseInt(html.find("." + c).val(), 10);
            if(amount < 0 || amount > sourceActor.data.data.currency[c]) {
                errors.push(c);
            }
        }

        if(errors.length !== 0) {
            ui.notifications.error("TransferStuff | " + game.i18n.localize(MODNAME + ".notEnoughCurrency") + " " + errors.join(", "));
        }
        else {
            const targetActor = game.actors.get(targetActorId)!;
            for(let c of currencies) {
                const amount = parseInt(html.find("." + c).val(), 10);
                const key = "data.currency." + c;
                sourceActor.update({ [key]: sourceActor.data.data.currency[c] - amount });
                targetActor.update({ [key]: targetActor.data.data.currency[c] + amount }); // key is between [] to force its evaluation
            }
        }
    }

    function showItemTransferDialog(originalQuantity: number, originalActorId: FoundryVTT.ActorId, targetActorId: FoundryVTT.ActorId, originalItemId: FoundryVTT.ItemId, createdItem: FoundryVTT.FutureItem) {
        const originalActor = game.actors.get(originalActorId)!;
        let transferDialog = new Dialog({
            title: 'How many items do you want to move?',
            content: `
              <form class="transferstuff">
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
                        transferItem(originalActor, targetActorId,originalItemId, createdItem, originalQuantity, transferedQuantity, stackItems);
                    }
                }
            },
            default: 'transfer'
        });
        transferDialog.render(true);
    }

    function showCurrencyTransferDialog(sourceActorId: FoundryVTT.ActorId, targetActorId: FoundryVTT.ActorId) {
        const sourceActor = game.actors.get(sourceActorId)!;
        let transferDialog = new Dialog({
            title: game.i18n.localize(MODNAME + ".howMuchCurrency"),
            content: `
              <form class="transferstuff">
                <div class="form-group">
                  Platinum: <input type="number" class="currency pp" value="0" min="0" max="${sourceActor.data.data.currency.pp}" />
                  Gold: <input type="number" class="currency gp" value="0" min="0" max="${sourceActor.data.data.currency.gp}" />
                  Electrum: <input type="number" class="currency ep" value="0" min="0" max="${sourceActor.data.data.currency.ep}" />
                  Silver: <input type="number" class="currency sp" value="0" min="0" max="${sourceActor.data.data.currency.sp}" />
                  Copper: <input type="number" class="currency cp" value="0" min="0" max="${sourceActor.data.data.currency.cp}" />
                </div>
              </form>`,
            buttons: {
                transfer: {
                    //icon: "<i class='fas fa-check'></i>",
                    label: `Transfer`,
                    callback: html => {
                        transferCurrency(html, sourceActorId, targetActorId);
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

    Hooks.on('dropActorSheetData', (dragTargetActor, sheet, futureItem) => {
        if(isAlt()) {
            return;  // ignore when Alt is pressed to drop.
        }

        if(futureItem.type == "Item" && futureItem.actorId) {
            if(!dragTargetActor.data._id) {
                console.warn("TransferStuff | target has no data._id?", dragTargetActor);
                return;
            }
            if(dragTargetActor.data._id == futureItem.actorId) {
                return;  // ignore dropping on self
            }
            let sourceActor = game.actors.get(futureItem.actorId);
            if(sourceActor) {
                /* if both source and target have the same type then allow deleting original item. this is a safety check because some game systems may allow dropping on targets that don't actually allow the GM or player to see the inventory, making the item inaccessible. */
                if(checkCompatible(sourceActor.data.type, dragTargetActor.data.type, futureItem)) {
                    const originalQuantity = futureItem.data.data.quantity;
                    const targetActorId = dragTargetActor.data._id;
                    const sourceActorId = futureItem.actorId;
                    if(futureItem.data.name === game.i18n.localize(MODNAME + ".currency")) {
                        showCurrencyTransferDialog(sourceActorId, targetActorId);
                        return false;
                    }
                    else if(originalQuantity >= 1) {
                        showItemTransferDialog(originalQuantity, sourceActorId, targetActorId, futureItem.data._id, futureItem);
                        return false;
                    }
                    else {
                        deleteItem(sourceActor, futureItem.data._id);
                    }
                }
            }
        }
    });
})();