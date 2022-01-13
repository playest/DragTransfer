import { registerSettings } from './settings/settings.js';
var dragTransfer = new Object();
var MODNAME = 'DRAGTANSFER';
(function () {
    function isAlt() {
        // check if Alt and only Alt is being pressed during the drop event.
        var alts = new Set(["Alt", "AltLeft"]);
        return (game.keyboard.downKeys.size == 1 && game.keyboard.downKeys.intersects(alts));
    }
    function checkCompatible(actorTypeName1, actorTypeName2, item) {
        console.info('DragNTransfer - Check Compatibility: Dragging Item:"' + String(item.data.type) + '" from sourceActor.data.type:"' + String(actorTypeName1) + '" to dragTarget.data.type:"' + String(actorTypeName2) + '".');
        var transferBetweenSameTypeActors = game.settings.get('DragTransfer', 'actorTransferSame');
        if (transferBetweenSameTypeActors && actorTypeName1 == actorTypeName2) {
            return true;
        }
        try {
            var transferPairs = JSON.parse("{" + game.settings.get('DragTransfer', 'actorTransferPairs') + "}");
            var withActorTypeName1 = transferPairs[actorTypeName1];
            var withActorTypeName2 = transferPairs[actorTypeName2];
            if (Array.isArray(withActorTypeName1) && withActorTypeName1.indexOf(actorTypeName2) !== -1)
                return true;
            if (Array.isArray(withActorTypeName2) && withActorTypeName2.indexOf(actorTypeName1) !== -1)
                return true;
            if (withActorTypeName1 == actorTypeName2)
                return true;
            if (withActorTypeName2 == actorTypeName1)
                return true;
        }
        catch (err) {
            console.error('DragTransfer: ', err.message);
            ui.notifications.error('DragTransfer: ' + err.message);
        }
        return false;
    }
    function deleteItem(actor, itemId) {
        if (actor.deleteEmbeddedDocuments != undefined) {
            actor.deleteEmbeddedDocuments("Item", [itemId]);
        }
        else {
            actor.deleteOwnedItem(itemId);
        }
    }
    function deleteItemIfZero(actor, itemId) {
        var item = actor.items.get(itemId);
        if (item == undefined) {
            return;
        }
        if (item.data.data.quantity <= 0) {
            deleteItem(actor, itemId);
        }
    }
    function transferItem(originalActor, targetActorId, originalItemId, createdItem, originalQuantity, transferedQuantity, stackItems) {
        var originalItem = originalActor.items.get(originalItemId);
        var targetActor = game.actors.get(targetActorId);
        if (originalItem == undefined) {
            console.error("Could not find the source item", originalItemId);
            return;
        }
        if (transferedQuantity > 0 && transferedQuantity <= originalQuantity) {
            var newOriginalQuantity = originalQuantity - transferedQuantity;
            var stacked = false; // will be true if a stack of item has been found and items have been stacked in it
            if (stackItems) {
                targetActor.items.forEach(function (i) {
                    console.log("diff", i, createdItem, "=", diffObject(i, createdItem));
                });
                var potentialStacks = targetActor.items.filter(function (i) { return i.name == originalItem.name && diffObject(createdItem, i) && i.data._id !== createdItem.data._id; });
                if (potentialStacks.length >= 1) {
                    potentialStacks[0].update({ "data.quantity": potentialStacks[0].data.data.quantity + transferedQuantity });
                    deleteItemIfZero(targetActor, createdItem.data._id);
                    stacked = true;
                }
            }
            originalItem.update({ "data.quantity": newOriginalQuantity }).then(function (i) { return deleteItemIfZero(i.parent, i.data._id); });
            if (stacked === false) {
                createdItem.data.data.quantity = transferedQuantity;
                targetActor.createEmbeddedDocuments("Item", [createdItem.data]);
            }
        }
        else {
            ui.notifications.error('DragTransfer: could not transfer ' + transferedQuantity + " items");
        }
    }
    function transferCurrency(html, sourceActorId, targetActorId) {
        var _a, _b;
        var currencies = ["pp", "gp", "ep", "sp", "cp"];
        console.log("Transfer currency:", html.find('input.currency'));
        //game.actors.get("d776K0YD9NBVwleL").data.data.currency
        //game.actors.get(targetActorId).update({"data.currency.cp": 12});
        var sourceActor = game.actors.get(sourceActorId);
        var errors = [];
        for (var _i = 0, currencies_1 = currencies; _i < currencies_1.length; _i++) {
            var c = currencies_1[_i];
            var amount = parseInt(html.find("." + c).val(), 10);
            if (amount < 0 || amount > sourceActor.data.data.currency[c]) {
                errors.push(c);
            }
        }
        if (errors.length !== 0) {
            ui.notifications.error("DragTransfer: " + game.i18n.localize(MODNAME + ".notEnoughCurrency") + " " + errors.join(", "));
        }
        else {
            var targetActor = game.actors.get(targetActorId);
            for (var _c = 0, currencies_2 = currencies; _c < currencies_2.length; _c++) {
                var c = currencies_2[_c];
                var amount = parseInt(html.find("." + c).val(), 10);
                var key = "data.currency." + c;
                sourceActor.update((_a = {}, _a[key] = sourceActor.data.data.currency[c] - amount, _a));
                targetActor.update((_b = {}, _b[key] = targetActor.data.data.currency[c] + amount, _b)); // key is between [] to force its evaluation
            }
        }
    }
    /**
    dragTransferData: { originalActorId, originalItemId, originalQuantity, newItemId }
    */
    function showItemTransferDialog(originalQuantity, originalActorId, targetActorId, originalItemId, createdItem) {
        var originalActor = game.actors.get(originalActorId);
        var transferDialog = new Dialog({
            title: 'How many items do you want to move?',
            content: "\n              <form>\n                <div class=\"form-group\">\n                  <input type=\"number\" class=\"transferedQuantity\" value=\"" + originalQuantity + "\" />\n                  <button onclick=\"this.parentElement.querySelector('.transferedQuantity').value = '1'\">" + game.i18n.localize(MODNAME + ".one") + "</button>\n                  <button onclick=\"this.parentElement.querySelector('.transferedQuantity').value = '" + Math.round(originalQuantity / 2) + "'\">" + game.i18n.localize(MODNAME + ".half") + "</button>\n                  <button onclick=\"this.parentElement.querySelector('.transferedQuantity').value = '" + originalQuantity + "'\">" + game.i18n.localize(MODNAME + ".max") + "</button>\n                  <label style=\"flex: none;\"><input style=\"vertical-align: middle;\" type=\"checkbox\" class=\"stack\" checked=\"checked\" /> " + game.i18n.localize(MODNAME + ".stackItems") + "</label>\n                </div>\n              </form>",
            buttons: {
                transfer: {
                    //icon: "<i class='fas fa-check'></i>",
                    label: game.i18n.localize(MODNAME + ".transfer"),
                    callback: function (html) {
                        var transferedQuantity = parseInt(html.find('input.transferedQuantity').val(), 10);
                        var stackItems = html.find('input.stack').is(":checked");
                        transferItem(originalActor, targetActorId, originalItemId, createdItem, originalQuantity, transferedQuantity, stackItems);
                    }
                }
            },
            default: 'transfer'
        });
        transferDialog.render(true);
    }
    function showCurrencyTransferDialog(sourceActorId, targetActorId) {
        var sourceActor = game.actors.get(sourceActorId);
        var transferDialog = new Dialog({
            title: game.i18n.localize(MODNAME + ".howMuchCurrency"),
            content: "\n              <form>\n                <div class=\"form-group\">\n                  Platinum: <input type=\"number\" class=\"currency pp\" value=\"0\" min=\"0\" max=\"" + sourceActor.data.data.currency.pp + "\" />\n                  Gold: <input type=\"number\" class=\"currency gp\" value=\"0\" min=\"0\" max=\"" + sourceActor.data.data.currency.gp + "\" />\n                  Electrum: <input type=\"number\" class=\"currency ep\" value=\"0\" min=\"0\" max=\"" + sourceActor.data.data.currency.ep + "\" />\n                  Silver: <input type=\"number\" class=\"currency sp\" value=\"0\" min=\"0\" max=\"" + sourceActor.data.data.currency.sp + "\" />\n                  Copper: <input type=\"number\" class=\"currency cp\" value=\"0\" min=\"0\" max=\"" + sourceActor.data.data.currency.cp + "\" />\n                </div>\n              </form>",
            buttons: {
                transfer: {
                    //icon: "<i class='fas fa-check'></i>",
                    label: "Transfer",
                    callback: function (html) {
                        transferCurrency(html, sourceActorId, targetActorId);
                    }
                }
            },
            default: game.i18n.localize(MODNAME + ".transfer")
        });
        transferDialog.render(true);
    }
    Hooks.once('init', function () {
        registerSettings();
    });
    Hooks.on('dropActorSheetData', function (dragTargetActor, sheet, futureItem) {
        if (isAlt()) {
            return; // ignore Drag'N'Transfer when Alt is pressed to drop.
        }
        if (futureItem.type == "Item" && futureItem.actorId) {
            if (!dragTargetActor.data._id) {
                console.warn("Drag'n'Transfer - target has no data._id?", dragTargetActor);
                return;
            }
            if (dragTargetActor.data._id == futureItem.actorId) {
                return; // ignore dropping on self
            }
            var sourceActor = game.actors.get(futureItem.actorId);
            if (sourceActor) {
                /* if both source and target have the same type then allow deleting original item. this is a safety check because some game systems may allow dropping on targets that don't actually allow the GM or player to see the inventory, making the item inaccessible. */
                if (checkCompatible(sourceActor.data.type, dragTargetActor.data.type, futureItem)) {
                    var originalQuantity = futureItem.data.data.quantity;
                    var targetActorId = dragTargetActor.data._id;
                    var sourceActorId = futureItem.actorId;
                    if (futureItem.data.name === game.i18n.localize(MODNAME + ".currency")) {
                        console.log(dragTargetActor, sheet, futureItem);
                        showCurrencyTransferDialog(sourceActorId, targetActorId);
                        return false;
                    }
                    else if (originalQuantity >= 1) {
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
