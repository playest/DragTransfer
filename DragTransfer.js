// DragTransfer
// (c) 2021 David Zvekic

"use strict";

import {registerSettings} from './settings/settings.js';

let dragTransfer = new Object();

let dragTransferTransaction = {};

(function() {
    function isAlt() {
        // check if Alt and only Alt is being pressed during the drop event.
        const alts = new Set(["Alt", "AltLeft"]);
        return (game.keyboard.downKeys.size == 1 && game.keyboard.downKeys.intersects(alts));
    }

    function checkCompatible(actorTypeName1, actorTypeName2, item) {
        console.info('DragNTransfer - Check Compatibility: Dragging Item:"' + String(item.data.type) + '" from sourceActor.data.type:"' + String(actorTypeName1) + '" to dragTarget.data.type:"' + String(actorTypeName2) + '".');

        const transferBetweenSameTypeActors = game.settings.get('DragTransfer', 'actorTransferSame');
        if(transferBetweenSameTypeActors && actorTypeName1 == actorTypeName2) {
            return true;
        }
        try {
            const transferPairs = JSON.parse("{" + game.settings.get('DragTransfer', 'actorTransferPairs') + "}");
            const withActorTypeName1 = transferPairs[actorTypeName1];
            const withActorTypeName2 = transferPairs[actorTypeName2];
            if(Array.isArray(withActorTypeName1) && withActorTypeName1.indexOf(actorTypeName2) !== -1) return true;
            if(Array.isArray(withActorTypeName2) && withActorTypeName2.indexOf(actorTypeName1) !== -1) return true;
            if(withActorTypeName1 == actorTypeName2) return true;
            if(withActorTypeName2 == actorTypeName1) return true;
        }
        catch(err) {
            console.error('DragTransfer: ', err.message);
            ui.notifications.error('DragTransfer: ' + err.message);
        }
        return false;
    }

    function deleteItem(actor, itemId) {
        if(actor.deleteEmbeddedDocuments != undefined) {
            actor.deleteEmbeddedDocuments("Item", [itemId]);
        }
        else {
            actor.deleteOwnedItem(itemId);
        }
    }

    function deleteItemIfZero(actor, itemId) {
        if(actor.items.get(itemId).data.data.quantity <= 0) {
            deleteItem(actor, itemId);
        }
    }

    /**
    dragTransferData: { originalActorId, originalItemId, originalQuantity, newItemId }
    */
    function showTransferDialog(dragTransferData, createdItem) {
        const originalActor = game.actors.get(dragTransferData.originalActorId);
        let transferDialog = new Dialog({
            title: 'How many items do you want to move?',
            content: `
              <form>
                <div class="form-group">
                  <input type="number" class="transferedQuantity" value="${dragTransferData.originalQuantity}" />
                  <button onclick="this.parentElement.querySelector('.transferedQuantity').value = '1'">One</button>
                  <button onclick="this.parentElement.querySelector('.transferedQuantity').value = '${Math.round(dragTransferData.originalQuantity / 2)}'">Half</button>
                  <button onclick="this.parentElement.querySelector('.transferedQuantity').value = '${dragTransferData.originalQuantity}'">Max</button><br />
                  <input type="checkbox" class="stack" checked="checked" /> Stack items of the same type
                </div>
              </form>`,
            buttons: {
                transfer: {
                    //icon: "<i class='fas fa-check'></i>",
                    label: `Transfer`,
                    callback: html => {
                        const originalItem = originalActor.items.get(dragTransferData.originalItemId);
                        if("dragTransfer" in createdItem.data.data) {
                            createdItem.update({"data.-=dragTransfer": null});
                            delete createdItem.data.data.dragTransfer; // remove module info that is not needed anymore
                        }
                        const transferedQuantity = parseInt(html.find('input.transferedQuantity').val(), 10);
                        const stackItems = html.find('input.stack').val() == "on";
                        if(transferedQuantity > 0 && transferedQuantity <= dragTransferData.originalQuantity) {
                            const newOriginalQuantity = dragTransferData.originalQuantity - transferedQuantity;
                            let stacked = false; // will be true if a stack of item has been found and items have been stacked in it
                            if(stackItems) {
                                createdItem.parent.items.forEach(i => {
                                    console.log("diff", i, createdItem, "=", diffObject(i, createdItem));
                                });
                                const potentialStacks = createdItem.parent.items.filter(i => i.name == createdItem.name && diffObject(createdItem, i) && i.data._id !== createdItem.data._id);
                                console.log("potentialStacks", potentialStacks);
                                if(potentialStacks.length >= 1) {
                                    potentialStacks[0].update({"data.quantity": potentialStacks[0].data.data.quantity + transferedQuantity});
                                    deleteItemIfZero(createdItem.parent, createdItem.data._id);
                                    stacked = true;
                                }
                            }
                            
                            originalItem.update({"data.quantity": newOriginalQuantity}).then((i) => deleteItemIfZero(i.parent, i.data._id));
                            if(stacked === false) {
                                createdItem.update({"data.quantity": transferedQuantity}).then((i) => deleteItemIfZero(i.parent, i.data._id));
                            }
                        }
                        else {
                            ui.notifications.error('DragTransfer: could not transfer ' + transferedQuantity + " items");
                        }
                    }
                }
            },
            default: 'transfer',
            close: html => {
                if("dragTransfer" in createdItem.data.data) {
                    createdItem.update({"data.-=dragTransfer": null});
                    delete createdItem.data.data.dragTransfer; // remove module info that is not needed anymore
                }
                //deleteItemIfZero(createdItem.parent, createdItem.data._id);
            }
        });
        transferDialog.render(true);
    }

    Hooks.once('init', () => {
        registerSettings();
    });

    /*
    options: {"temporary":false, "renderSheet":false, "render":true}
    */
    Hooks.on('createItem', (createdItem, options, userId) => {
        console.log("createItem", createdItem, options, userId);
        if("dragTransfer" in createdItem.data.data) {
            console.log("dragTransfer info detected on created object", createdItem.data.data.dragTransfer);
            const dtd = createdItem.data.data.dragTransfer;
            const dtd2 = {
                originalActorId: dtd.originalActorId,
                originalItemId: dtd.originalItemId,
                originalQuantity: dtd.originalQuantity,
                newItemId: createdItem.data._id
            }
            showTransferDialog(dtd2, createdItem);
        }
    });

    Hooks.on('dropActorSheetData', (dragTargetActor, sheet, futureItem) => {
        if(isAlt()) {
            return;  // ignore Drag'N'Transfer when Alt is pressed to drop.
        }

        if(futureItem.type == "Item" && futureItem.actorId) {
            if(!dragTargetActor.data._id) {
                console.warn("Drag'n'Transfer - target has no data._id?", dragTargetActor);
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
                    if(originalQuantity > 1) {
                        // It seems that custom fields are only kept if put in .data.data
                        futureItem.data.data.quantity = 0; // we'll set it to the right value later after the user has said how many they want to transfer
                        const originalItem = game.actors.get(futureItem.actorId).items.get(futureItem.data._id);
                        futureItem.data.data.dragTransfer = {
                            originalActorId: futureItem.actorId,
                            originalQuantity: originalQuantity,
                            originalItemId: originalItem.data._id
                        };
                    }
                    else {
                        deleteItem(sourceActor, futureItem.data._id);
                    }
                }
            }
        }
    });

})();