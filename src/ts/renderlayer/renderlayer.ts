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
    name: string;
    typeIdentifier: string;
    textureIdentifier: string;
    previewTextureUuid: string | undefined; // Specifically allowed to be undefined if no texture was selected
}

// Main class for active instances of RenderLayers for when Blockbench is opened
// Anything other than the RenderLayerData will NOT be saved in the .bbmodel file
export class RenderLayer {
    data: RenderLayerData;
    selected: boolean = false;

    constructor(data: RenderLayerData) {
        this.data = data;
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
        return this.data.previewTextureUuid != undefined;
    }

    public getTexture(): Texture {
        if(!this.hasTexture()) return undefined;

        let textureIndex: number = Texture.all.findInArray("uuid", this.data.previewTextureUuid);
        return Texture.all[textureIndex] || Texture.getDefault();
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

export function unselectAllRenderLayers(): void {
    getRenderLayersProperty().forEach(layer => {
        layer.unselect();
    });
    updateInterfacePanels();
}