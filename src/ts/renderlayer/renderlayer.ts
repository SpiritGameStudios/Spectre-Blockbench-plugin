// This file holds all classes and functions related to handling & manging a project's RenderLayers
import {getRenderLayersProperty} from "../properties";
import {editRenderLayerDialog, loadRenderLayerPanel, openLayerContextMenu, unloadRenderLayerPanel} from "./layerui";

export function loadRenderLayers(): void {
    loadRenderLayerPanel();

    // Called on Undo.initEdit AND Undo.finishEdit
    Blockbench.on("create_undo_save", onCreateUndoSave);

    // Called on undo AND redo
    Blockbench.on("load_undo_save", onLoadUndoSave)
}

export function unloadRenderLayers(): void {
    unloadRenderLayerPanel();

    Blockbench.removeListener("create_undo_save", onCreateUndoSave);
    Blockbench.removeListener("load_undo_save", onLoadUndoSave);
}

// All information related to RenderLayers which will be saved in the .bbmodel file
export interface RenderLayerData {
    name: string; // Layer name
    uuid?: string; // Layer UUID - Set by the RenderLayer's constructor during creation, or just set during parsing
    typeId: string; // Layer Type Identifier path
    textureId: string; // Texture Identifier path
    // "no_texture" allows the data to define specifically not to search for any texture UUIDs as fallback
    previewTexUuid: string | "no_texture"; // Blockbench preview texture UUID
}

// Main class for active instances of RenderLayers for when Blockbench is opened
// Anything other than the RenderLayerData will NOT be saved in the .bbmodel file
export class RenderLayer {
    data: RenderLayerData;
    selected: boolean = false;

    constructor(data: RenderLayerData) {
        this.data = data;

        // UUID can sometimes already be present in the data from parsing the .bbmodel
        if (!this.data.uuid) this.data.uuid = guid();
    }

    public select(event: MouseEvent): void {
        if (event && (event.shiftKey || event.ctrlOrCmd || Pressing.overrides.ctrl || Pressing.overrides.shift)) {
            // TODO - multi select logic here
        } else {
            unselectAllRenderLayers();
        }
        this.selected = true;
        updateInterfacePanels();
    }

    public unselect(): void {
        this.selected = false;
    }

    // Double left click edit dialog menu
    public openEditDialog(event: MouseEvent): void {
        this.select(event);
        editRenderLayerDialog(this);
    }

    // Right click options menu
    public openContextMenu(event: MouseEvent): void {
        this.select(event);
        openLayerContextMenu(this, event);
    }

    public hasTexture(): boolean {
        return this.data.previewTexUuid && this.data.previewTexUuid != "no_texture";
    }

    public getTexture(): Texture {
        if(!this.hasTexture()) return undefined;

        // @ts-expect-error - findInArray actually returns the object, not the object's index in the array ¯\_(ツ)_/¯
        return Texture.all.findInArray("uuid", this.data.previewTexUuid) || Texture.getDefault();
    }

    public getTextureSource(): string {
        if (!this.hasTexture()) return undefined;
        return this.getTexture().source;
    }

    // Gather all data to be saved to the .bbmodel file when compiled
    public getSaveCopy(): RenderLayerData {
        return this.data;
    }

    public remove(): void {
        getRenderLayersProperty().remove(this);
    }
}

export function addRenderLayer(layer: RenderLayer): void {
    initLayerUndo({renderlayers: []});
    getRenderLayersProperty().push(layer);
    updateInterfacePanels();
    finishLayerUndo("Add Render Layer", {renderlayers: [layer]});
}

// Create a RenderLayerData object with defaults from an object (e.g. form result)
// You can also just initialize a new RenderLayerData object if needed (e.g. variable names don't match)
export function copyToRenderLayerData(object: any, copyUuid?: string): RenderLayerData {
    // Default data - UUID is set by the RenderLayer constructor
    let layerData: RenderLayerData = {
        name: "Layer",
        uuid: copyUuid,
        typeId: "no_type",
        textureId: "no_texture",
        previewTexUuid: Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
    }

    if (object.name) layerData.name = object.name;
    if (object.layerName) layerData.name = object.layerName; // Alt variable option
    if (object.uuid && !copyUuid) layerData.uuid = object.uuid;
    if (object.typeId) layerData.typeId = object.typeId;
    if (object.textureId) layerData.textureId = object.textureId;
    if (object.previewTexUuid)
        layerData.previewTexUuid = object.previewTexUuid;

    return layerData;
}

export function unselectAllRenderLayers(): void {
    getRenderLayersProperty().forEach(layer => {
        layer.unselect();
    });
    updateInterfacePanels();
}

export function deleteSelectedRenderLayers(): void {
    let selectedLayers: RenderLayer[] = getRenderLayersProperty().filter(layer => layer.selected);

    initLayerUndo({renderlayers: selectedLayers});
    for (const layer of selectedLayers) {
        layer.remove();
    }
    finishLayerUndo("Remove Render Layer", {renderlayers: []});

    updateInterfacePanels();
}

export function getRenderLayerByUuid(uuid: string): RenderLayer | undefined {
    return getRenderLayersProperty().find(layer => layer.data.uuid === uuid);
}

// The normal UndoAspects interface doesn't allow custom properties,
// but Javascript allows you to sorta just add variable to stuff,
// so Render Layer undo works by adding our `renderlayers` field to the UndoAspects,
// and handles them by hooking into Blockbench's create & save undo state events.

// This interface is only here to make the following functions slightly nicer to use compared to normal Undo edit usage
export interface RenderLayerUndoAspects {
    renderlayers?: RenderLayer[];
}

export function initLayerUndo(aspects: RenderLayerUndoAspects): void {
    Undo.initEdit({
        // @ts-expect-error
        renderlayers: aspects.renderlayers
    });
}

export function finishLayerUndo(actionName: string, aspects?: RenderLayerUndoAspects): void {
    if (aspects) {
        Undo.finishEdit(actionName, {
            // @ts-expect-error
            renderlayers: aspects.renderlayers
        });
    } else {
        Undo.finishEdit(actionName);
    }
}

function onCreateUndoSave(data: any): void {
    // Add each Render Layer's UUID to the list
    let save: UndoSave = data.save as UndoSave;
    let aspects: UndoAspects = data.aspects as UndoAspects;
    if (!save || !aspects) return; // Prevent errors
    if (!aspects["renderlayers"]) return; // Prevent extra data if no render layers in aspects

    save["renderlayers"] = {};
    aspects["renderlayers"].forEach(layer => {
        // Clone because setting it directly will continue to reference the object after modifications
        save["renderlayers"][layer.data.uuid] = structuredClone(layer);
    });
}

function onLoadUndoSave(data: any): void {
    let save: UndoSave = data.save as UndoSave;
    let reference: UndoSave = data.reference as UndoSave;
    if (!save || !reference) return;
    if (!save["renderlayers"]) return;

    // Handle redo and I think layer property changes
    for (let layerUuid in save["renderlayers"]) {
        if (reference["renderlayers"][layerUuid]) {
            let layer: RenderLayer = getRenderLayerByUuid(layerUuid);
            if (!layer) continue;

            layer.data = save["renderlayers"][layerUuid].data;
        } else {
            addRenderLayer(new RenderLayer(save["renderlayers"][layerUuid].data));
        }

    }

    // Handle undo
    for (let layerUuid in reference["renderlayers"]) {
        if (save["renderlayers"][layerUuid]) continue; // Skip edits where layers are only modified

        let layer: RenderLayer = getRenderLayerByUuid(layerUuid);
        if (!layer) continue;
        layer.unselect();
        layer.remove();
    }
    updateInterfacePanels();
}