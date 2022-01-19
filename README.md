This project is inspired by the [amazing work](https://github.com/David-Zvekic/DragTransfer) of [David Zvekic](https://ko-fi.com/davidzvekic).

**TransferStuff**, a module for Foundry VTT.

Enable moving (rather than cloning) inventory anc currencies between actors by dragging and dropping.

# Install

There is multiple way to install this module:

- The **FoundryVTT way**
    - Search for "TransferStuff" into the search bar in your FoundryVTT interface at "Add-on Modules / Install Module"
    - It should be stable
    - You will get updates automatically when (and if) I update the new version into the FoundryVTT website
- The **latest way**
    - Copy [this URL](https://github.com/playest/TransferStuff/releases/latest/download/module.json) into "Add-on Modules / Install Module / Manifest URL"
    - It should be stable
    - You will get updates automatically this way
- The **old way**
    - Choose your version on the [release page](https://github.com/playest/TransferStuff/releases)
    - Copy the link to the "module.json" file into "Add-on Modules / Install Module / Manifest URL"
    - It may be **unstable**, old version often contains bug that have been fixed since then
    - You will get updates automatically this way, which is probably **not what you want** so you may want to lock the package
- The **nightly way**
    - Find the [nightly release](https://github.com/playest/TransferStuff/releases/tag/vnightly) on the [release page](https://github.com/playest/TransferStuff/releases)
    - Copy the link to the "module.json" file into "Add-on Modules / Install Module / Manifest URL"
    - It may be **unstable**
    - You will get updates automatically this way
- The **git way**
    - Clone this repo into `<FoundryVTT Install Directory>/Data/modules/` and [build it](DEV.md)
    - It may be **unstable**
    - You will **not** get updates automatically this way

In this section "automatic updates" refers to the update button in the "Add-on Modules" tab.

# Features

This tool is for GMs who want to move items between character sheets, without duplicating them. It can also potentially increase the quantity of the items if the same kind of item is already present on the second character sheet.

Standard Foundry VTT behavior clones items when they are dragged and dropped from 1 actor-sheet to another. If you prefer the item to not be duplicated, this module might be what you are looking for: **TransferStuff** causes the item to be deleted from the original sheet when it is dropped onto another actor sheet.

I've tested it with DND5e. You can tell me if you get it to work on other systems.

It is important for GM's to test this module in their world because TransferStuff **assumes** that the item will be cloned onto the destination. TransferStuff hooks on the drop action, and doesnt know if another module ALSO hooks onto the drop action and changes the destiny of that dropped item. For example: if another module canceled the cloning, preventing the item from being cloned, TransferStuff would not know and would still delete the item from the original actor sheet.

# Usage

1. Just install and when dropping items onto an actor sheet from another actor, it will be moved rather than cloned (see Limitations below). The system may open a dialog window to ask you how many items you want to move (useful when the quantity field is more than 1) and if you want to stack those items with other equivalent items at the destination.

2. If a character sheet contains an item name "Currency" (the name may change if you use another translation) then it will ask you how much money you want to transfer to the other sheet when you try to transfer the item instead of actually transfering the item.

3. If you hold the ALT-key during a drag then the default Foundry cloning behavior will be allowed to work.

4. In TransferStuff module settings, the GM can now explicitly specify that certain actor types are compatible with the "Compatible Actor Types" setting. For instance in dnd5e, its possible for both "character" and "npc" types to transfer items, so the GM may want to drag items between NPCs and Characters. To specify compatible types, use a coma separated list of JSON key-value pairs separated by a colon character. It is necessary that each key only exists once. To specify equivalences between more than 2 types, you must define it as a circular key-value list such as `"A":"B", "B":"C", "C":"A"`.

If you include a list such as `"A":"B", "A":"C"` (where the "A" key appears multiple times) then some of the keys will be ignored. To make it work you must use the list syntax and write `"A": ["B", "C"]` instead.

Examples I use:

* For dnd5e: `"character":"npc"`
* For dnd5e but with multiple values for one of the keys: `"character":["vehicle", "character"],"vehicle":"character"`
* For alienrpg: `"character":"synthetic","synthetic":"vehicles","vehicles":"character"`

(note that up to alienrpg 2.0.0 the actor sheet for "vehicles" only support weapons and are not compatible otherwise so this isn't a bug in TransferStuff if a Motion Tracker transferred to a vehicle vanishes (see Limitations).


# Limitations

1) If the actorSheet you are dragging from belongs to an unlinked actor (accessible by double clicking on an unlinked token) this module does not do anything because no dropActorSheetData event occurs. I am looking for a workaround to this.

2) To prevent deletion of items when they are dropped onto sheets that lack a compatible inventory section, by default this module will only respond when both the source and target of the drag and drop are both of the same "type". There is no universal guaranteed way to know if an actor has a compatible inventory, but I assume that if you can access inventory to drag items from a specific type, that the destination will be compatible.

If you are playing a system that gives incompatible actors the same "type", then this safety check wont work and you must take responsibility to ensure you dont drop items onto target sheets that lack the ability to display the same items as the source. This module will delete the original copy, and you may have no way to access the resulting copy made in the destination actor JSON (for instance dropping a Talent into a Vehicle in Aliens with this module would delete the Talent despite the Vehicle sheet not displaying the Talent).

**PRO TIP**: If players want you player to have access to a shared chest, you can create an Actor-sheet with a token that looks like a box or container, and then let them transfer inventory into it's character sheet.
