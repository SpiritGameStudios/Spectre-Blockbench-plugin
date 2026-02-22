// This file holds all classes and functions related to handling & manging a project's RenderLayers
import {getRenderLayersProperty} from "../properties";
import {editRenderLayerDialog, loadRenderLayerPanel, unloadRenderLayerPanel} from "./layerui";

export function loadRenderLayers(): void {
    loadRenderLayerPanel();
}

export function unloadRenderLayers(): void {
    unloadRenderLayerPanel();
}

// All information related to RenderLayers which will be saved in the .bbmodel file
export interface RenderLayerData {
    name: string; // Layer name
    uuid?: string; // Layer UUID
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
        this.selected = true;
        updateInterfacePanels();
    }

    public unselect(): void {
        this.selected = false;
    }

    public openEditMenu(event: MouseEvent): void {
        this.select(event);
        editRenderLayerDialog(this);
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
    public getSaveCopy() {
        return this.data;
    }
}

export function addRenderLayer(layer: RenderLayer): void {
    getRenderLayersProperty().push(layer);
    updateInterfacePanels();
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

export function getRenderLayerByUuid(uuid: string): RenderLayer | undefined {
    return getRenderLayersProperty().find(layer => layer.data.uuid === uuid);
}