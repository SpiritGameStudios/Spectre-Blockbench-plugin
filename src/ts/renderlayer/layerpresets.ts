// This file contains functions for everything related to Render Layer presets, including creating InputFormConfigs and exporting presets
import {RenderLayerDialogOptions} from "./layerui";
import {RenderLayerData} from "./renderlayer";

// INSTRUCTIONS FOR ADDING A NEW PRESET
// todo - this ~ good freaking luck

export interface RenderLayerPreset {
    name: string;
    id: string;
    config: Function
}

export const DEFAULT_RENDER_LAYER_PRESET: string = "living_entity";

export const RENDER_LAYER_PRESETS: Record<string, RenderLayerPreset> = {
    "living_entity": {
        name: "Living Entity",
        id: "spectre:living_entity",
        config: createLivingEntityInputConfig
    },
    "emissive_texture": {
        name: "Emissive Texture",
        id: "spectre:emissive_texture",
        config: createEmissiveTextureInputConfig
    },
    "custom": {
        name: "Custom...",
        id: "",
        config: createCustomInputConfig
    }
}

// region Render Layer Preset Configs
function createLivingEntityInputConfig(dialogOptions: RenderLayerDialogOptions): InputFormConfig {
    return {
        textureId: appendTextureIdInput(dialogOptions),
        previewTexUuid: appendPreviewTexUuidInput(dialogOptions),
        tint: {
            label: "Tint",
            description: "The tint color of this layer.",
            type: "color",
            value: "#FFFFFFFF"
        }
    }
}

function createEmissiveTextureInputConfig(dialogOptions: RenderLayerDialogOptions): InputFormConfig {
    return {
        textureId: appendTextureIdInput(dialogOptions),
        previewTexUuid: appendPreviewTexUuidInput(dialogOptions),
        emissiveLevel: {
            label: "Emissive Level",
            type: "num_slider",
            value: 255, // TODO - Handle form saving
            min: 0,
            max: 255
        }
    }
}

function createCustomInputConfig(dialogOptions: RenderLayerDialogOptions): InputFormConfig {
    return {
        previewTexUuid: appendPreviewTexUuidInput(dialogOptions),
        customJson: {
            label: "JSON",
            type: "textarea",
            description: "The exported JSON for this layer.",
            value: dialogOptions.formResults.customJson || ""
        }
    }
}
// endregion

// region Common Config Entries
function appendTextureIdInput(dialogOptions: RenderLayerDialogOptions): FormElementOptions {
    let formResults: any = dialogOptions.formResults || {};
    let layerData: RenderLayerData | any = getOrEmptyLayerData(dialogOptions);

    return {
        label: "Texture Identifier",
        description: "The Minecraft Identifier path for this layer's texture. This will be used when exported, but won't do much for previewing in Blockbench.",
        type: "text",
        value: formResults.textureId || layerData.textureId || "",
        placeholder: layerData.textureId || "minecraft:entity/zombie"
    }
}

function appendPreviewTexUuidInput(dialogOptions: RenderLayerDialogOptions): FormElementOptions {
    let formResults: any = dialogOptions.formResults || {};
    let layerData: RenderLayerData | any = getOrEmptyLayerData(dialogOptions);

    // TODO - I'd love to have image previews of the textures here
    // Map<Texture UUID, Texture Name> - UUID is used for finding the texture, name is used for visual input from user
    let availableTextures: Record<string, string> = {}
    availableTextures["no_texture"] = "No Texture";
    Texture.all.forEach(texture => {
        availableTextures[texture.uuid] = texture.name;
    })

    return {
        label: "Blockbench Preview Texture",
        description: "The preview texture used in Blockbench. This texture's width & length may be used in export, but the image itself can not be exported.",
        type: "select",
        options: availableTextures,
        value: formResults.previewTexUuid ||
            layerData.previewTexUuid ? layerData.previewTexUuid
            : Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
    }
}
// endregion

// region Utils
function getOrEmptyLayerData(dialogOptions: RenderLayerDialogOptions): RenderLayerData | any {
    return dialogOptions.editingLayer ? dialogOptions.editingLayer.data : {};
}
// endregion